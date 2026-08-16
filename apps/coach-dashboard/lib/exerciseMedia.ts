export type ExerciseMediaType = 'gif' | 'video' | 'image' | 'thumbnail';
export type ExerciseMediaFormat = 'gif' | 'mp4' | 'webp' | 'jpg' | 'png';

export interface ExerciseMediaRecord {
  id: string;
  exercise_id: string;
  media_type: ExerciseMediaType;
  file_format: ExerciseMediaFormat;
  r2_key: string | null;
  url: string | null;
  thumbnail_url: string | null;
  is_primary: boolean;
  media_status: string | null;
  media_notes: string | null;
  created_at: string | null;
}

export type ExerciseMediaCompletenessFilter = 'complete' | 'missing_gif' | 'missing_video' | 'missing_thumbnail';

export interface ExerciseMediaCompleteness {
  complete: boolean;
  missingGif: boolean;
  missingVideo: boolean;
  missingThumbnail: boolean;
}

export interface ExerciseMediaPageResult {
  data: ExerciseMediaRecord[] | null;
  error: { message: string } | null;
}

export type ExerciseMediaPageLoader = (
  exerciseIds: string[],
  from: number,
  to: number,
) => Promise<ExerciseMediaPageResult>;

const TYPE_ORDER: Record<ExerciseMediaType, number> = {
  gif: 0,
  video: 1,
  image: 2,
  thumbnail: 3,
};

const RECOGNIZED_MEDIA_EXTENSIONS = new Set(['gif', 'mp4', 'webm', 'webp', 'jpg', 'jpeg', 'png']);

function mediaUrlExtension(value: string): string | null {
  const filename = new URL(value).pathname.split('/').pop() ?? '';
  const match = filename.match(/\.([a-z0-9]+)$/i);
  return match?.[1]?.toLowerCase() ?? null;
}

export function isValidExerciseMediaUrl(value: string, type?: ExerciseMediaType): boolean {
  try {
    if (!value || /\s/.test(value)) return false;
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !parsed.hostname) return false;
    if (!type) return true;

    const extension = mediaUrlExtension(value);
    if (!extension || !RECOGNIZED_MEDIA_EXTENSIONS.has(extension)) return true;
    if (type === 'gif') return extension === 'gif';
    if (type === 'video') return extension === 'mp4';
    return extension === 'webp' || extension === 'jpg' || extension === 'jpeg' || extension === 'png';
  } catch {
    return false;
  }
}

export function formatForMediaUrl(type: ExerciseMediaType, url: string): ExerciseMediaFormat {
  if (type === 'gif') return 'gif';
  if (type === 'video') return 'mp4';
  const pathname = new URL(url).pathname.toLowerCase();
  if (pathname.endsWith('.png')) return 'png';
  if (pathname.endsWith('.jpg') || pathname.endsWith('.jpeg')) return 'jpg';
  return 'webp';
}

export function orderExerciseMedia(rows: ExerciseMediaRecord[]): ExerciseMediaRecord[] {
  return [...rows].sort((a, b) => {
    if (a.is_primary !== b.is_primary) return a.is_primary ? -1 : 1;
    const typeDifference = TYPE_ORDER[a.media_type] - TYPE_ORDER[b.media_type];
    if (typeDifference !== 0) return typeDifference;
    return (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.id.localeCompare(b.id);
  });
}

export function isExternalMedia(row: Pick<ExerciseMediaRecord, 'r2_key' | 'url'>): boolean {
  return !row.r2_key && Boolean(row.url);
}

export function hasDuplicateExerciseMediaUrl(
  rows: Pick<ExerciseMediaRecord, 'id' | 'url'>[],
  url: string,
  excludeId?: string,
): boolean {
  const candidate = url.trim();
  return rows.some((row) => row.id !== excludeId && row.url?.trim() === candidate);
}

export function isUsableExerciseMedia(row: Pick<ExerciseMediaRecord, 'r2_key' | 'url'>): boolean {
  return Boolean(row.r2_key?.trim()) || Boolean(row.url && isValidExerciseMediaUrl(row.url));
}

export function classifyExerciseMedia(rows: ExerciseMediaRecord[]): ExerciseMediaCompleteness {
  const usableTypes = new Set(rows.filter(isUsableExerciseMedia).map((row) => row.media_type));
  const missingGif = !usableTypes.has('gif');
  const missingVideo = !usableTypes.has('video');
  const missingThumbnail = !usableTypes.has('thumbnail') && !usableTypes.has('image');
  return {
    complete: !missingGif && !missingVideo && !missingThumbnail,
    missingGif,
    missingVideo,
    missingThumbnail,
  };
}

export function matchesExerciseMediaFilter(rows: ExerciseMediaRecord[], filter: ExerciseMediaCompletenessFilter): boolean {
  const completeness = classifyExerciseMedia(rows);
  if (filter === 'complete') return completeness.complete;
  if (filter === 'missing_gif') return completeness.missingGif;
  if (filter === 'missing_video') return completeness.missingVideo;
  return completeness.missingThumbnail;
}

export function previewErrorKey(row: Pick<ExerciseMediaRecord, 'id' | 'r2_key' | 'url'>, resolvedUrl?: string | null): string {
  return `${row.id}:${row.r2_key ?? ''}:${row.url ?? ''}:${resolvedUrl ?? ''}`;
}

export async function fetchAllExerciseMediaRows(
  exerciseIds: string[],
  loadPage: ExerciseMediaPageLoader,
  options: { pageSize?: number; idChunkSize?: number } = {},
): Promise<ExerciseMediaRecord[]> {
  const pageSize = options.pageSize ?? 1000;
  const idChunkSize = options.idChunkSize ?? 200;
  if (!Number.isInteger(pageSize) || pageSize < 1 || pageSize > 1000) throw new Error('Invalid exercise media page size.');
  if (!Number.isInteger(idChunkSize) || idChunkSize < 1) throw new Error('Invalid exercise ID chunk size.');

  const uniqueExerciseIds = Array.from(new Set(exerciseIds));
  const rowsById = new Map<string, ExerciseMediaRecord>();
  for (let chunkStart = 0; chunkStart < uniqueExerciseIds.length; chunkStart += idChunkSize) {
    const idChunk = uniqueExerciseIds.slice(chunkStart, chunkStart + idChunkSize);
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await loadPage(idChunk, offset, offset + pageSize - 1);
      if (error) throw new Error(`Could not load complete exercise media: ${error.message}`);
      const page = data ?? [];
      for (const row of page) if (!rowsById.has(row.id)) rowsById.set(row.id, row);
      if (page.length < pageSize) break;
    }
  }
  return Array.from(rowsById.values());
}
