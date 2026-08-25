export interface ChartPoint {
  x: number;
  y: number;
}

export function calculateTrendPoints(
  values: number[],
  width: number,
  height: number,
  padX = 8,
  padY = 10,
): ChartPoint[] {
  if (values.length === 0) return [];

  const min = Math.min(...values);
  const max = Math.max(...values);
  const isFlat = max === min;
  const drawableWidth = Math.max(0, width - padX * 2);
  const drawableHeight = Math.max(0, height - padY * 2);

  return values.map((value, index) => ({
    x: padX + (values.length === 1 ? 0.5 : index / (values.length - 1)) * drawableWidth,
    y: isFlat
      ? padY + drawableHeight / 2
      : padY + (1 - (value - min) / (max - min)) * drawableHeight,
  }));
}

export function buildTrendLinePath(points: ChartPoint[]): string {
  if (points.length === 0) return '';
  return `M ${points.map(({ x, y }) => `${x},${y}`).join(' L ')}`;
}
