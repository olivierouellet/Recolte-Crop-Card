import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { interpret, progress } from '../src/interpret';
import { DEFAULT_PRODUCTS, PRODUCTS } from '../src/products';

describe('interpret', () => {
  it('classes percentiles', () => {
    expect(interpret('percentile', 9.9)?.label).toBe('much_below');
    expect(interpret('percentile', 10)?.label).toBe('below');
    expect(interpret('percentile', 25)?.label).toBe('normal');
    expect(interpret('percentile', 75)?.label).toBe('normal');
    expect(interpret('percentile', 90)?.label).toBe('above');
    expect(interpret('percentile', 99.7)).toEqual({ label: 'much_above', tone: 2 });
  });

  it('classes SPI and SPEI on McKee’s scale', () => {
    expect(interpret('spi', -2)?.label).toBe('extremely_dry');
    expect(interpret('spi', -1.5)?.label).toBe('severely_dry');
    expect(interpret('spi', -1)?.label).toBe('moderately_dry');
    expect(interpret('spi', -0.99)?.label).toBe('near_normal');
    expect(interpret('spi', 0.99)?.label).toBe('near_normal');
    expect(interpret('spi', 1)?.label).toBe('moderately_wet');
    expect(interpret('spi', 1.5)?.label).toBe('very_wet');
    expect(interpret('spi', 2)?.label).toBe('extremely_wet');
  });

  it('classes Palmer indices', () => {
    expect(interpret('palmer', -4.2)?.label).toBe('extreme_drought');
    expect(interpret('palmer', -2.5)).toEqual({ label: 'moderate_drought', tone: -2 });
    expect(interpret('palmer', 0.3)?.label).toBe('near_normal');
    expect(interpret('palmer', 3.1)?.label).toBe('very_wet');
  });

  it('leaves values without a standard scale alone', () => {
    expect(interpret(undefined, 136.7)).toBeNull();
  });
});

describe('progress', () => {
  it('goes from 0 to 1', () => {
    expect(progress(1350, 2700)).toBe(0.5);
    expect(progress(3516.92, 2700)).toBe(1);
    expect(progress(100, undefined)).toBeNull();
    expect(progress(100, 0)).toBeNull();
  });
});

describe('products', () => {
  const fr = JSON.parse(readFileSync(new URL('../src/localize/languages/fr.json', import.meta.url), 'utf8'));

  it('are all named, and the defaults exist', () => {
    for (const key of Object.keys(PRODUCTS)) {
      expect(fr.product[key]?.label, key).toBeTruthy();
      expect(fr.product[key]?.name, key).toBeTruthy();
    }
    expect(Object.keys(fr.product).sort()).toEqual(Object.keys(PRODUCTS).sort());
    for (const key of DEFAULT_PRODUCTS) expect(PRODUCTS[key], key).toBeDefined();
  });

  it('match the integration’s catalog size and defaults', () => {
    // custom_components/recolte/products.py in the Récolte integration: change both together.
    expect(Object.keys(PRODUCTS)).toHaveLength(63);
    expect(DEFAULT_PRODUCTS).toEqual(['ch_gs', 'gd_5', 'ac_07', 'ac_gs', 'av_gs', 'pe_gs', 'ds_cc', 'pnm_im']);
  });
});
