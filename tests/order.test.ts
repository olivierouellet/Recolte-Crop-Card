import { describe, expect, it } from 'vitest';

import { locationName, locationSensors, recolteLocations } from '../src/data/locations';
import { fullOrder, moved, storedOrder, visibleOrder } from '../src/order';
import type { HassEntity, HomeAssistant } from '../src/types';

const AVAILABLE = ['ch_gs', 'gd_5', 'ac_07', 'ac_gs', 'pnm_im'];

describe('tile order', () => {
  it('is the integration’s order until the user changes it', () => {
    expect(visibleOrder(AVAILABLE)).toEqual(AVAILABLE);
  });

  it('puts the stored order first, then products added since', () => {
    expect(fullOrder(AVAILABLE, ['ac_gs', 'ch_gs'])).toEqual(['ac_gs', 'ch_gs', 'gd_5', 'ac_07', 'pnm_im']);
  });

  it('drops products the location no longer has, and repeats', () => {
    expect(fullOrder(['ch_gs', 'ac_gs'], ['ds_cc', 'ac_gs', 'ac_gs'])).toEqual(['ac_gs', 'ch_gs']);
  });

  it('hides products without losing their place', () => {
    const order = ['pnm_im', 'ch_gs'];
    expect(visibleOrder(AVAILABLE, order, ['ch_gs', 'ac_07'])).toEqual(['pnm_im', 'gd_5', 'ac_gs']);
    expect(fullOrder(AVAILABLE, order)[1]).toBe('ch_gs');
  });

  it('moves an item as ha-sortable reports it', () => {
    expect(moved(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moved(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
  });

  it('stores nothing for the natural order', () => {
    expect(storedOrder(AVAILABLE, [...AVAILABLE])).toBeUndefined();
    expect(storedOrder(AVAILABLE, moved(AVAILABLE, 4, 0))).toEqual(['pnm_im', 'ch_gs', 'gd_5', 'ac_07', 'ac_gs']);
  });
});

describe('Récolte locations', () => {
  const sensor = (entity_id: string, product: string): HassEntity => ({
    entity_id,
    state: '1',
    last_updated: '',
    attributes: {
      product,
      attribution: 'Agriculture et Agroalimentaire Canada (Licence du gouvernement ouvert – Canada)',
    },
  });
  const hass: HomeAssistant = {
    config: { latitude: 45.4, longitude: -75.7 },
    states: Object.fromEntries(
      [
        sensor('sensor.ferme_precipitation_growing_season', 'ac_gs'),
        sensor('sensor.ferme_crop_heat_units_corn', 'ch_gs'),
        sensor('sensor.erabliere_dry_days_in_a_row', 'ds_cc'),
        { entity_id: 'sensor.other', state: '3', last_updated: '', attributes: {} },
      ].map((s) => [s.entity_id, s]),
    ),
    entities: {
      'sensor.ferme_precipitation_growing_season': {
        entity_id: 'sensor.ferme_precipitation_growing_season',
        device_id: 'dev-ferme',
        platform: 'recolte',
      },
      'sensor.ferme_crop_heat_units_corn': {
        entity_id: 'sensor.ferme_crop_heat_units_corn',
        device_id: 'dev-ferme',
        platform: 'recolte',
      },
      'sensor.erabliere_dry_days_in_a_row': {
        entity_id: 'sensor.erabliere_dry_days_in_a_row',
        device_id: 'dev-erabliere',
        platform: 'recolte',
      },
      'sensor.other': { entity_id: 'sensor.other', device_id: 'dev-ferme', platform: 'template' },
    },
    devices: {
      'dev-ferme': { id: 'dev-ferme', name: 'Ferme', name_by_user: null },
      'dev-erabliere': { id: 'dev-erabliere', name: 'Érablière', name_by_user: 'Cabane à sucre' },
    },
  };

  it('lists the locations by name', () => {
    expect(recolteLocations(hass)).toEqual([
      { id: 'dev-erabliere', name: 'Cabane à sucre' },
      { id: 'dev-ferme', name: 'Ferme' },
    ]);
    expect(locationName(hass, 'dev-ferme')).toBe('Ferme');
    expect(locationName(hass, 'gone')).toBeUndefined();
  });

  it('finds a location’s sensors, in catalog order, and nothing else on the device', () => {
    expect([...locationSensors(hass, 'dev-ferme')]).toEqual([
      ['ch_gs', 'sensor.ferme_crop_heat_units_corn'],
      ['ac_gs', 'sensor.ferme_precipitation_growing_season'],
    ]);
    expect(locationSensors(hass, 'gone').size).toBe(0);
  });
});
