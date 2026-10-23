import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { fetchReadings, fromEntity, isRecolteSensor, parseIdentify, parseLatest, parseValue } from '../src/data/aafc';

// Recorded 2026-10-23 at the Central Experimental Farm in Ottawa by the integration's scripts/record_fixtures.py.
const folder = new URL('./fixtures/', import.meta.url);
const load = (name: string) => JSON.parse(readFileSync(new URL(name, folder), 'utf8'));
const OTTAWA = [45.3889, -75.7152] as const;

describe('parseValue', () => {
  it('reads numbers and drops NoData', () => {
    expect(parseValue('142.884')).toBe(142.884);
    expect(parseValue('NoData')).toBeNull();
    expect(parseValue('1.13427e+38')).toBeNull();
    expect(parseValue(undefined)).toBeNull();
  });
});

describe('parseLatest', () => {
  it('reads each product’s latest date', () => {
    const latest = parseLatest(load('accumulated_precipitation_query.json'));
    expect(new Date(latest.ac_gs).toISOString()).toBe('2026-10-22T12:00:00.000Z');
    expect(new Date(latest.ac_wi).toISOString()).toBe('2026-03-31T12:00:00.000Z');
  });

  it('reports service errors', () => {
    expect(() => parseLatest({ error: { message: 'Invalid query' } })).toThrow('Service error: Invalid query');
  });
});

describe('parseIdentify', () => {
  it('keeps the newest valid value, as a percentage for percentiles', () => {
    const payload = load('precipitation_percentile_identify.json');
    expect(parseIdentify(payload, ['pe_gs'])).toEqual([{ key: 'pe_gs', value: 99.7365, date: '2026-10-21' }]);

    payload.properties.Values[0] = '1.13427e+38'; // the newest raster, being replaced
    expect(parseIdentify(payload, ['pe_gs'])).toEqual([{ key: 'pe_gs', value: 99.7721, date: '2026-10-19' }]);
  });

  it('reads several products from one query, and nothing off the grid', () => {
    const readings = parseIdentify(load('accumulated_precipitation_identify.json'), ['ac_07', 'ac_gs', 'ac_wi']);
    expect(readings).toContainEqual({ key: 'ac_gs', value: 761.411, date: '2026-10-22' });
    expect(readings).toContainEqual({ key: 'ac_wi', value: 307.374, date: '2026-03-31' });
    expect(parseIdentify(load('covers_ocean.json'), ['ch_gs'])).toEqual([]);
  });
});

describe('fetchReadings', () => {
  afterEach(() => vi.unstubAllGlobals());

  /** Serves the recorded files, and fails if two requests are ever in flight at once. */
  function serveRecorded(fail: string[] = []) {
    const files = new Set(readdirSync(folder));
    let inFlight = 0;
    const urls: URL[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (input: string) => {
        const url = new URL(input);
        urls.push(url);
        inFlight += 1;
        if (inFlight > 1) throw new Error('concurrent requests');
        await new Promise((resolve) => setTimeout(resolve, 1));
        inFlight -= 1;
        const [service, , operation] = url.pathname.split('/').slice(-3);
        if (fail.includes(service)) return new Response('', { status: 503 });
        const name = `${service}_${operation}.json`;
        if (!files.has(name)) return new Response('', { status: 404 });
        return new Response(readFileSync(new URL(name, folder)));
      }),
    );
    return urls;
  }

  it('reads one service at a time and names the products', async () => {
    const urls = serveRecorded();
    const readings = await fetchReadings(...OTTAWA, ['ch_gs', 'ac_gs', 'ac_07', 'nonsense']);
    expect(readings).toContainEqual({ key: 'ch_gs', value: 3516.92, date: '2026-10-19' });
    expect(readings).toContainEqual({ key: 'ac_07', value: 21.0217, date: '2026-10-22' });
    expect(urls.map((u) => u.pathname.split('/').slice(-3).join('/'))).toEqual([
      'accumulated_precipitation/ImageServer/query',
      'accumulated_precipitation/ImageServer/identify',
      'crop_heat_units/ImageServer/query',
      'crop_heat_units/ImageServer/identify',
    ]);
    const mosaic = JSON.parse(urls[1].searchParams.get('mosaicRule')!);
    expect(mosaic.where).toBe(
      "(tType = 'ac_07' AND dateEnd >= timestamp '2026-10-08 12:00:00') OR " +
        "(tType = 'ac_gs' AND dateEnd >= timestamp '2026-10-08 12:00:00')",
    );
    expect(JSON.parse(urls[1].searchParams.get('geometry')!)).toEqual({
      x: -75.7152,
      y: 45.3889,
      spatialReference: { wkid: 4326 },
    });
  });

  it('shows what it could read when one service is down, and fails when all are', async () => {
    serveRecorded(['crop_heat_units']);
    expect(await fetchReadings(...OTTAWA, ['ch_gs', 'gd_5'])).toEqual([
      { key: 'gd_5', value: 2133.8, date: '2026-10-19' },
    ]);
    serveRecorded(['crop_heat_units']);
    await expect(fetchReadings(...OTTAWA, ['ch_gs'])).rejects.toThrow('HTTP 503');
  });
});

describe('the integration’s sensors', () => {
  const sensor = {
    entity_id: 'sensor.ferme_crop_heat_units_corn',
    state: '3516.92',
    last_updated: '',
    attributes: {
      product: 'ch_gs',
      date: '2026-10-19',
      attribution: 'Agriculture et Agroalimentaire Canada (Licence du gouvernement ouvert – Canada)',
    },
  };

  it('reads a Récolte sensor', () => {
    expect(isRecolteSensor(sensor)).toBe(true);
    expect(fromEntity(sensor)).toEqual({
      key: 'ch_gs',
      value: 3516.92,
      date: '2026-10-19',
      entity: 'sensor.ferme_crop_heat_units_corn',
    });
    expect(fromEntity({ ...sensor, state: 'unavailable' })).toBeNull();
  });

  it('ignores other sensors', () => {
    expect(isRecolteSensor({ ...sensor, attributes: { product: 'ch_gs' } })).toBe(false);
    expect(isRecolteSensor({ ...sensor, attributes: { ...sensor.attributes, product: 'xyz' } })).toBe(false);
  });
});
