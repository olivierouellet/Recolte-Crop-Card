import type { Scale } from './products';

/** Where a value sits from dry (−3) to wet (+3); 0 is near normal. */
export type Tone = -3 | -2 | -1 | 0 | 1 | 2 | 3;

export interface Interpretation {
  /** Translation key under `class.` */
  label: string;
  tone: Tone;
}

/**
 * The published classes for the indices with a standard scale. The card shows them as a label; it never
 * changes the value.
 *
 * - Percentiles: below 10 much below normal, 10–25 below, 25–75 near normal, 75–90 above, over 90 much above.
 * - SPI and SPEI (McKee et al., 1993): ±1 moderately, ±1.5 severely (very, wet side), ±2 extremely.
 * - Palmer indices (Palmer, 1965): ±1 mild (slightly), ±2 moderate, ±3 severe (very), ±4 extreme.
 */
export function interpret(scale: Scale | undefined, value: number): Interpretation | null {
  switch (scale) {
    case 'percentile':
      if (value < 10) return { label: 'much_below', tone: -2 };
      if (value < 25) return { label: 'below', tone: -1 };
      if (value <= 75) return { label: 'normal', tone: 0 };
      if (value <= 90) return { label: 'above', tone: 1 };
      return { label: 'much_above', tone: 2 };
    case 'spi':
      if (value <= -2) return { label: 'extremely_dry', tone: -3 };
      if (value <= -1.5) return { label: 'severely_dry', tone: -2 };
      if (value <= -1) return { label: 'moderately_dry', tone: -1 };
      if (value < 1) return { label: 'near_normal', tone: 0 };
      if (value < 1.5) return { label: 'moderately_wet', tone: 1 };
      if (value < 2) return { label: 'very_wet', tone: 2 };
      return { label: 'extremely_wet', tone: 3 };
    case 'palmer':
      if (value <= -4) return { label: 'extreme_drought', tone: -3 };
      if (value <= -3) return { label: 'severe_drought', tone: -3 };
      if (value <= -2) return { label: 'moderate_drought', tone: -2 };
      if (value <= -1) return { label: 'mild_drought', tone: -1 };
      if (value < 1) return { label: 'near_normal', tone: 0 };
      if (value < 2) return { label: 'slightly_wet', tone: 1 };
      if (value < 3) return { label: 'moderately_wet', tone: 2 };
      if (value < 4) return { label: 'very_wet', tone: 3 };
      return { label: 'extremely_wet', tone: 3 };
    default:
      return null;
  }
}

/** Progress toward a heat target, from 0 to 1. */
export function progress(value: number, target: number | undefined): number | null {
  if (!target || target <= 0) return null;
  return Math.max(0, Math.min(1, value / target));
}
