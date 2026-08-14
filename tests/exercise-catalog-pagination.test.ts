import { describe, it, expect } from 'vitest';

/** Helper simulating deterministic range pagination over a dataset */
function paginateDataset(
  dataset: Array<{ id: string; updated_at: string; name: string; source_type: string }>,
  pullDateMs: number,
  batchSize: number = 1000
) {
  // Filter by pullDate (updated_at >= pullDate)
  const filtered = dataset.filter(row => new Date(row.updated_at).getTime() >= pullDateMs);

  // Stable sort by updated_at ascending, then id ascending
  const sorted = [...filtered].sort((a, b) => {
    const timeA = new Date(a.updated_at).getTime();
    const timeB = new Date(b.updated_at).getTime();
    if (timeA !== timeB) return timeA - timeB;
    return a.id.localeCompare(b.id);
  });

  // Paginate in batches
  const result: typeof dataset = [];
  const seenIds = new Set<string>();
  let from = 0;

  while (true) {
    const chunk = sorted.slice(from, from + batchSize);
    if (chunk.length === 0) break;

    for (const row of chunk) {
      if (!seenIds.has(row.id)) {
        seenIds.add(row.id);
        result.push(row);
      }
    }

    if (chunk.length < batchSize) break;
    from += batchSize;
  }

  return result;
}

describe('DEFECT 5.A — Exercise Catalog Pagination Tests', () => {
  it('fully returns 2,491 rows across 3 pages (batch size 1000)', () => {
    const mockDb = Array.from({ length: 2491 }, (_, i) => ({
      id: `ex-${i.toString().padStart(4, '0')}`,
      updated_at: '2026-08-01T00:00:00.000Z',
      name: `Exercise ${i}`,
      source_type: i < 396 ? 'yeti_first_party' : 'legacy_catalog',
    }));

    const paginated = paginateDataset(mockDb, 0, 1000);
    expect(paginated.length).toBe(2491);
    expect(paginated[0].id).toBe('ex-0000');
    expect(paginated[2490].id).toBe('ex-2490');
    expect(paginated[1000].source_type).toBe('legacy_catalog');
  });

  it('correctly handles exactly 1,000 rows without extra empty loop', () => {
    const mockDb = Array.from({ length: 1000 }, (_, i) => ({
      id: `ex-${i.toString().padStart(4, '0')}`,
      updated_at: '2026-08-01T00:00:00.000Z',
      name: `Exercise ${i}`,
      source_type: 'yeti_first_party',
    }));

    const paginated = paginateDataset(mockDb, 0, 1000);
    expect(paginated.length).toBe(1000);
  });

  it('correctly handles 1,001 rows across 2 pages', () => {
    const mockDb = Array.from({ length: 1001 }, (_, i) => ({
      id: `ex-${i.toString().padStart(4, '0')}`,
      updated_at: '2026-08-01T00:00:00.000Z',
      name: `Exercise ${i}`,
      source_type: 'yeti_first_party',
    }));

    const paginated = paginateDataset(mockDb, 0, 1000);
    expect(paginated.length).toBe(1001);
    expect(paginated[1000].id).toBe('ex-1000');
  });

  it('correctly handles fewer than 1,000 rows in a single batch', () => {
    const mockDb = Array.from({ length: 350 }, (_, i) => ({
      id: `ex-${i.toString().padStart(4, '0')}`,
      updated_at: '2026-08-01T00:00:00.000Z',
      name: `Exercise ${i}`,
      source_type: 'yeti_first_party',
    }));

    const paginated = paginateDataset(mockDb, 0, 1000);
    expect(paginated.length).toBe(350);
  });

  it('does not skip rows that share identical updated_at timestamps (tie-breaker by id)', () => {
    const sameTimestamp = '2026-08-01T12:00:00.000Z';
    const mockDb = Array.from({ length: 1500 }, (_, i) => ({
      id: `ex-${(1500 - i).toString().padStart(4, '0')}`, // Reverse ID order
      updated_at: sameTimestamp,
      name: `Exercise ${i}`,
      source_type: 'legacy_catalog',
    }));

    const paginated = paginateDataset(mockDb, 0, 1000);
    expect(paginated.length).toBe(1500);

    // Verify stable sorting by ID tie-breaker
    expect(paginated[0].id).toBe('ex-0001');
    expect(paginated[1499].id).toBe('ex-1500');
  });

  it('deduplicates duplicate IDs defensively', () => {
    const mockDb = [
      { id: 'ex-1', updated_at: '2026-08-01T00:00:00.000Z', name: 'Ex 1', source_type: 'yeti_first_party' },
      { id: 'ex-1', updated_at: '2026-08-01T00:00:00.000Z', name: 'Ex 1 Dupe', source_type: 'yeti_first_party' },
      { id: 'ex-2', updated_at: '2026-08-01T00:00:00.000Z', name: 'Ex 2', source_type: 'legacy_catalog' },
    ];

    const paginated = paginateDataset(mockDb, 0, 1000);
    expect(paginated.length).toBe(2);
    expect(paginated.map(e => e.id)).toEqual(['ex-1', 'ex-2']);
  });

  it('ensures a page-two exercise appears in the final returned list', () => {
    const mockDb = Array.from({ length: 2491 }, (_, i) => ({
      id: i === 1500 ? 'a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1' : `ex-${i.toString().padStart(4, '0')}`,
      updated_at: '2026-08-01T00:00:00.000Z',
      name: i === 1500 ? '3/4 Sit-up (Legacy a45e) (Legacy a45e)' : `Exercise ${i}`,
      source_type: i > 395 ? 'legacy_catalog' : 'yeti_first_party',
    }));

    const paginated = paginateDataset(mockDb, 0, 1000);
    const target = paginated.find(e => e.name.includes('3/4 Sit-up'));
    expect(target).toBeDefined();
    expect(target?.id).toBe('a45ea3f6-aee0-4fdb-ada0-7483c9b3f1d1');
  });

  it('preserves incremental pullDate filtering', () => {
    const mockDb = [
      { id: 'ex-old', updated_at: '2026-07-01T00:00:00.000Z', name: 'Old Ex', source_type: 'yeti_first_party' },
      { id: 'ex-new', updated_at: '2026-08-02T00:00:00.000Z', name: 'New Ex', source_type: 'legacy_catalog' },
    ];

    const pullDate = new Date('2026-08-01T00:00:00.000Z').getTime();
    const paginated = paginateDataset(mockDb, pullDate, 1000);

    expect(paginated.length).toBe(1);
    expect(paginated[0].id).toBe('ex-new');
  });
});
