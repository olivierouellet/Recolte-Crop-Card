/**
 * Tile order. With a Récolte location, the card shows every product the location has; `order` puts some of them
 * first, in that order, and `hide` leaves some out. A product added later in the integration has no place in
 * `order`, so it shows at the end until it's moved.
 */

/** Every available product in display order, hidden ones included (what the editor lists). */
export function fullOrder(available: string[], order: string[] = []): string[] {
  const present = new Set(available);
  const first = [...new Set(order)].filter((key) => present.has(key));
  return [...first, ...available.filter((key) => !first.includes(key))];
}

/** The tiles to show, in order. */
export function visibleOrder(available: string[], order: string[] = [], hide: string[] = []): string[] {
  const hidden = new Set(hide);
  return fullOrder(available, order).filter((key) => !hidden.has(key));
}

/** A list with one item moved, as `ha-sortable` reports it. */
export function moved<T>(list: T[], oldIndex: number, newIndex: number): T[] {
  const result = [...list];
  result.splice(newIndex, 0, result.splice(oldIndex, 1)[0]);
  return result;
}

/** `order` to store: nothing when it is the natural order, so the YAML stays short. */
export function storedOrder(available: string[], order: string[]): string[] | undefined {
  return order.length === available.length && order.every((key, i) => key === available[i]) ? undefined : order;
}
