import { INTEGRATION_DOMAIN } from '../const';
import { PRODUCTS } from '../products';
import type { HomeAssistant } from '../types';
import { isRecolteSensor } from './aafc';

/** A location of the Récolte integration: one config entry, one device. */
export interface RecolteLocation {
  id: string;
  name: string;
}

const CATALOG = Object.keys(PRODUCTS);

/** The integration's sensors on a device, by product, in catalog order (the integration's own order). */
export function locationSensors(hass: HomeAssistant, deviceId: string): Map<string, string> {
  const byProduct = new Map<string, string>();
  for (const entry of Object.values(hass.entities ?? {})) {
    if (entry.device_id !== deviceId || entry.platform !== INTEGRATION_DOMAIN) continue;
    const stateObj = hass.states[entry.entity_id];
    if (stateObj && isRecolteSensor(stateObj)) byProduct.set(String(stateObj.attributes.product), entry.entity_id);
  }
  return new Map([...byProduct].sort(([a], [b]) => CATALOG.indexOf(a) - CATALOG.indexOf(b)));
}

export function locationName(hass: HomeAssistant, deviceId: string): string | undefined {
  const device = hass.devices?.[deviceId];
  return device ? (device.name_by_user ?? device.name ?? undefined) : undefined;
}

/** Every device that has Récolte sensors, by name. */
export function recolteLocations(hass: HomeAssistant): RecolteLocation[] {
  const ids = new Set(
    Object.values(hass.entities ?? {})
      .filter((e) => e.platform === INTEGRATION_DOMAIN && e.device_id)
      .map((e) => e.device_id as string),
  );
  return [...ids]
    .map((id) => ({ id, name: locationName(hass, id) ?? id }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
