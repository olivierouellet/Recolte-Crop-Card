/**
 * The AAFC agroclimate products, keyed by the service's `tType` code.
 *
 * Mirrored in the Récolte integration's `custom_components/recolte/products.py`: change one, change the other.
 */

/** How a value reads: the card adds a label for the ones with a standard scale. */
export type Scale = 'percentile' | 'spi' | 'palmer';

/** Units as the card shows them; `chu`, `gdd` and `days` are translated. */
export type Unit = 'mm' | '%' | '°C' | 'days' | 'chu' | 'gdd' | null;

export interface Product {
  key: string;
  service: string;
  unit: Unit;
  precision: number;
  icon: string;
  /** Applied to the pixel value (percentiles are published as fractions). */
  factor: number;
  scale?: Scale;
}

const ROLLING = ['30', '60', '90'];
const SEASONS = ['gs', 'ay'];

function series(prefix: string, periods: string[], rest: Omit<Product, 'key' | 'factor'> & { factor?: number }) {
  return periods.map((period) => ({ factor: 1, ...rest, key: `${prefix}_${period}` }));
}

const LIST: Product[] = [
  { key: 'ch_gs', service: 'crop_heat_units', unit: 'chu', precision: 0, icon: 'mdi:corn', factor: 1 },
  ...series('gd', ['0', '5', '10', '15'], {
    service: 'growing_degree_days',
    unit: 'gdd',
    precision: 0,
    icon: 'mdi:sprout',
  }),
  ...series('ac', ['01', '07', '14', ...ROLLING, ...SEASONS, 'wi'], {
    service: 'accumulated_precipitation',
    unit: 'mm',
    precision: 1,
    icon: 'mdi:weather-rainy',
  }),
  ...series('av', [...ROLLING, ...SEASONS], {
    service: 'percent_of_average_precipitation',
    unit: '%',
    precision: 0,
    icon: 'mdi:water-percent',
  }),
  ...series('pe', [...ROLLING, ...SEASONS], {
    service: 'precipitation_percentile',
    unit: '%',
    precision: 1,
    icon: 'mdi:chart-bell-curve',
    factor: 100,
    scale: 'percentile',
  }),
  ...series('dnp', [...ROLLING, ...SEASONS], {
    service: 'departure_from_average_precipitation',
    unit: 'mm',
    precision: 1,
    icon: 'mdi:plus-minus-variant',
  }),
  { key: 'ds_cc', service: 'dry_spell', unit: 'days', precision: 0, icon: 'mdi:water-off', factor: 1 },
  ...series('ds', ['gs', ...ROLLING], {
    service: 'dry_spell',
    unit: 'days',
    precision: 0,
    icon: 'mdi:water-off-outline',
  }),
  ...['25', '30', '32'].flatMap((t) =>
    series(`hw${t}`, ['cc', 'gs'], {
      service: 'heat_wave',
      unit: 'days',
      precision: 0,
      icon: 'mdi:weather-sunny-alert',
    }),
  ),
  ...series('tx', ['01', '07'], {
    service: 'maximum_temperature',
    unit: '°C',
    precision: 1,
    icon: 'mdi:thermometer-chevron-up',
  }),
  ...series('ti', ['01', '07'], {
    service: 'minimum_temperature',
    unit: '°C',
    precision: 1,
    icon: 'mdi:thermometer-chevron-down',
  }),
  ...series('dntm', ['28', 'mo'], {
    service: 'difference_from_normal_temperature',
    unit: '°C',
    precision: 1,
    icon: 'mdi:thermometer-lines',
  }),
  ...series('spi', ['30', '90', '180', '365'], {
    service: 'standardized_precipitation_index',
    unit: null,
    precision: 2,
    icon: 'mdi:chart-bell-curve-cumulative',
    scale: 'spi',
  }),
  ...series('spei', ['30', '90', '180', '365'], {
    service: 'standardized_precipitation_evapotranspiration_index',
    unit: null,
    precision: 2,
    icon: 'mdi:chart-bell-curve-cumulative',
    scale: 'spi',
  }),
  ...['pdsi', 'phdi', 'pmdi'].map((index) => ({
    key: `${index}_im`,
    service: 'palmer_drought_index',
    unit: null,
    precision: 2,
    icon: 'mdi:gauge',
    factor: 1,
    scale: 'palmer' as const,
  })),
  { key: 'mai_im', service: 'palmer_drought_index', unit: null, precision: 2, icon: 'mdi:gauge', factor: 1 },
  {
    key: 'tsm_im',
    service: 'versatile_soil_moisture_budget',
    unit: 'mm',
    precision: 0,
    icon: 'mdi:water-outline',
    factor: 1,
  },
  {
    key: 'pnm_im',
    service: 'versatile_soil_moisture_budget',
    unit: '%',
    precision: 0,
    icon: 'mdi:water-percent',
    factor: 1,
  },
  {
    key: 'dnm_im',
    service: 'versatile_soil_moisture_budget',
    unit: 'mm',
    precision: 0,
    icon: 'mdi:plus-minus-variant',
    factor: 1,
  },
  ...['bist', 'bilt'].map((index) => ({
    key: `${index}_im`,
    service: 'blended_index',
    unit: null,
    precision: 2,
    icon: 'mdi:gauge',
    factor: 1,
  })),
];

export const PRODUCTS: Record<string, Product> = Object.fromEntries(LIST.map((p) => [p.key, p]));

/** What a new card shows: same as a new location in the integration. */
export const DEFAULT_PRODUCTS = ['ch_gs', 'gd_5', 'ac_07', 'ac_gs', 'av_gs', 'pe_gs', 'ds_cc', 'pnm_im'];
