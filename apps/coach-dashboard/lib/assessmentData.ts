export const MEASUREMENT_TYPES = [
  'weight_kg',
  'body_fat_pct',
  'chest_cm',
  'waist_cm',
  'hips_cm',
  'arms_cm',
  'legs_cm',
] as const;

export type MeasurementType = (typeof MEASUREMENT_TYPES)[number];

export interface MeasurementRow {
  id: string;
  user_id: string;
  type: string;
  value: number;
  logged_at: string;
}

export const MEASUREMENT_LABELS: Record<MeasurementType, { label: string; unit: string }> = {
  weight_kg: { label: 'Weight', unit: 'kg' },
  body_fat_pct: { label: 'Body fat', unit: '%' },
  chest_cm: { label: 'Chest', unit: 'cm' },
  waist_cm: { label: 'Waist', unit: 'cm' },
  hips_cm: { label: 'Hips', unit: 'cm' },
  arms_cm: { label: 'Arms', unit: 'cm' },
  legs_cm: { label: 'Legs', unit: 'cm' },
};

export function isSupportedMeasurement(type: string): type is MeasurementType {
  return MEASUREMENT_TYPES.includes(type as MeasurementType);
}

export function normalizeMeasurements(rows: MeasurementRow[]) {
  return rows
    .filter((row) => isSupportedMeasurement(row.type) && Number.isFinite(Number(row.value)))
    .map((row) => ({ ...row, type: row.type as MeasurementType, value: Number(row.value) }))
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
}

export function latestMeasurements(rows: ReturnType<typeof normalizeMeasurements>) {
  return rows.reduce<Partial<Record<MeasurementType, (typeof rows)[number]>>>((latest, row) => {
    latest[row.type] = row;
    return latest;
  }, {});
}
