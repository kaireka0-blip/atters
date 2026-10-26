import { REGIONS } from '../types';

const titleCase = (value: string) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, character => character.toUpperCase());

export function buildPackageRegionOptions(
  existingValues: readonly string[] = [],
  configuredValues?: readonly string[],
): { value: string; label: string }[] {
  const values = configuredValues ?? REGIONS.map(region => region.value);
  const regions = new Map<string, string>();

  values.forEach(value => {
    const normalized = String(value || '').trim().toLowerCase();
    if (!normalized) return;
    regions.set(normalized, REGIONS.find(region => region.value.toLowerCase() === normalized)?.label || titleCase(normalized));
  });

  existingValues.forEach(value => {
    const normalized = String(value || '').trim().toLowerCase();
    if (normalized && !regions.has(normalized)) regions.set(normalized, titleCase(normalized));
  });

  return Array.from(regions, ([value, label]) => ({ value, label }));
}

export function normalizePackageRegionTag(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('id-ID')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
