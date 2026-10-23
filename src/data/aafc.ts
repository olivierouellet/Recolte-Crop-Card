import { REFRESH_MS, SERVICES_URL } from '../const';
import { PRODUCTS } from '../products';
import type { HassEntity, HomeAssistant, Reading } from '../types';

/**
 * AgClimate, read the way the Récolte integration reads it (`custom_components/recolte/api.py`): per service,
 * each product's latest raster date, then one point query over the last two weeks of rasters, keeping each
 * product's newest valid value.
 */

const DAY = 86_400_000;
/** The newest daily raster can read NoData while it is being replaced. */
const LOOKBACK = 14 * DAY;
/** Pixels outside the grid read "NoData"; inside, missing values are float32's 1.13427e+38. */
const MISSING = 1e30;
const LATEST_DATE = '[{"statisticType":"max","onStatisticField":"dateEnd","outStatisticFieldName":"latest"}]';
const CACHE_PREFIX = 'recolte-crop-card:';

interface Feature {
  attributes: Record<string, unknown>;
}
interface ServicePayload {
  error?: { message?: string };
  features?: Feature[];
  catalogItems?: { features?: Feature[] } | null;
  properties?: { Values?: unknown[] } | null;
}

export function parseValue(text: unknown): number | null {
  const value = Number(text);
  return text === null || text === undefined || text === '' || Number.isNaN(value) || Math.abs(value) >= MISSING
    ? null
    : value;
}

function checked(payload: ServicePayload): ServicePayload {
  if (!payload || typeof payload !== 'object') throw new Error('Unexpected response');
  if (payload.error) throw new Error(`Service error: ${payload.error.message ?? 'unknown'}`);
  return payload;
}

/** Each product's latest raster date (epoch ms), from a statistics query. */
export function parseLatest(payload: ServicePayload): Record<string, number> {
  const latest: Record<string, number> = {};
  for (const f of checked(payload).features ?? []) {
    const key = String(f.attributes.tType);
    const ms = Number(f.attributes.latest);
    if (f.attributes.latest !== null && !Number.isNaN(ms)) latest[key] = ms;
  }
  return latest;
}

/** The newest valid value of each wanted product, from a point query with its catalog items. */
export function parseIdentify(payload: ServicePayload, keys: string[]): Reading[] {
  const data = checked(payload);
  const items = data.catalogItems?.features ?? [];
  const values = data.properties?.Values ?? [];
  const newest = new Map<string, { at: number; value: number }>();
  items.forEach((item, i) => {
    const key = String(item.attributes.tType);
    const value = parseValue(values[i]);
    const at = Number(item.attributes.dateEnd);
    if (!keys.includes(key) || value === null || Number.isNaN(at)) return;
    if (!newest.has(key) || at > newest.get(key)!.at) newest.set(key, { at, value });
  });
  return [...newest].map(([key, { at, value }]) => ({
    key,
    value: Math.round(value * PRODUCTS[key].factor * 1e6) / 1e6,
    date: new Date(at).toISOString().slice(0, 10),
  }));
}

function sqlTimestamp(ms: number): string {
  return `timestamp '${new Date(ms).toISOString().slice(0, 19).replace('T', ' ')}'`;
}

async function getJson(service: string, operation: string, params: Record<string, string>): Promise<ServicePayload> {
  const query = new URLSearchParams({ ...params, f: 'json' });
  const response = await fetch(`${SERVICES_URL}/${service}/ImageServer/${operation}?${query}`);
  if (!response.ok) throw new Error(`${service}: HTTP ${response.status}`);
  return response.json();
}

async function readService(service: string, keys: string[], lat: number, lon: number): Promise<Reading[]> {
  const quoted = keys.map((k) => `'${k}'`).join(',');
  const latest = parseLatest(
    await getJson(service, 'query', {
      where: `tType IN (${quoted})`,
      groupByFieldsForStatistics: 'tType',
      outStatistics: LATEST_DATE,
    }),
  );
  const wanted = Object.entries(latest)
    .filter(([key]) => keys.includes(key))
    .sort(([a], [b]) => (a < b ? -1 : 1));
  if (!wanted.length) return [];
  const where = wanted
    .map(([key, ms]) => `(tType = '${key}' AND dateEnd >= ${sqlTimestamp(ms - LOOKBACK)})`)
    .join(' OR ');
  const mosaicRule = JSON.stringify({
    mosaicMethod: 'esriMosaicAttribute',
    sortField: 'dateEnd',
    sortValue: '3000',
    ascending: true,
    where,
  });
  const payload = await getJson(service, 'identify', {
    geometry: JSON.stringify({ x: lon, y: lat, spatialReference: { wkid: 4326 } }),
    geometryType: 'esriGeometryPoint',
    mosaicRule,
    returnGeometry: 'false',
    returnCatalogItems: 'true',
    returnPixelValues: 'true',
  });
  return parseIdentify(payload, keys);
}

/** Read products at a point. One service at a time: the server lets concurrent requests time out. */
export async function fetchReadings(lat: number, lon: number, keys: string[]): Promise<Reading[]> {
  const byService = new Map<string, string[]>();
  for (const key of [...new Set(keys)].filter((k) => k in PRODUCTS).sort()) {
    const service = PRODUCTS[key].service;
    byService.set(service, [...(byService.get(service) ?? []), key]);
  }
  const readings: Reading[] = [];
  const errors: unknown[] = [];
  for (const [service, serviceKeys] of byService) {
    try {
      readings.push(...(await readService(service, serviceKeys, lat, lon)));
    } catch (err) {
      errors.push(err); // one service down shouldn't hide the others
    }
  }
  if (errors.length && errors.length === byService.size) throw errors[0];
  return readings;
}

function cacheKey(lat: number, lon: number, keys: string[]): string {
  return `${CACHE_PREFIX}${lat.toFixed(3)},${lon.toFixed(3)}:${[...keys].sort().join(',')}`;
}

/** `fetchReadings`, cached in this browser for as long as the card waits between reads. */
export async function cachedReadings(lat: number, lon: number, keys: string[]): Promise<Reading[]> {
  const key = cacheKey(lat, lon, keys);
  try {
    const cached = JSON.parse(localStorage.getItem(key) ?? 'null');
    if (cached && Date.now() - cached.at < REFRESH_MS) return cached.readings;
  } catch {
    // no storage (private window, preview): fetch
  }
  const readings = await fetchReadings(lat, lon, keys);
  try {
    localStorage.setItem(key, JSON.stringify({ at: Date.now(), readings }));
  } catch {
    // storage full or blocked: fine
  }
  return readings;
}

/** A sensor of the Récolte integration: a known product code, and AAFC as its source. */
export function isRecolteSensor(stateObj: HassEntity): boolean {
  const product = stateObj.attributes.product;
  const attribution = String(stateObj.attributes.attribution ?? '');
  return (
    stateObj.entity_id.startsWith('sensor.') &&
    typeof product === 'string' &&
    product in PRODUCTS &&
    attribution.startsWith('Agriculture et Agroalimentaire Canada')
  );
}

export function recolteSensors(hass: HomeAssistant): string[] {
  return Object.values(hass.states)
    .filter(isRecolteSensor)
    .map((s) => s.entity_id);
}

/** A Récolte sensor's reading, or null while it is unavailable. */
export function fromEntity(stateObj: HassEntity): Reading | null {
  if (!isRecolteSensor(stateObj)) return null;
  const value = Number(stateObj.state);
  if (stateObj.state === '' || Number.isNaN(value)) return null;
  return {
    key: String(stateObj.attributes.product),
    value,
    date: String(stateObj.attributes.date ?? ''),
    entity: stateObj.entity_id,
  };
}
