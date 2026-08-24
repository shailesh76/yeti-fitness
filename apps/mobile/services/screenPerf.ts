export type ScreenPerfStage = 'T0 route render' | 'T1 local cache read' | 'T2 local DB/storage read' |
  'T3 remote start' | 'T4 remote response' | 'T5 state reconciliation' | 'T6 visible authoritative UI';

export function createScreenPerfTrace(screen: string) {
  const started = typeof performance !== 'undefined' ? performance.now() : Date.now();
  const seen = new Set<ScreenPerfStage>();
  return (stage: ScreenPerfStage) => {
    if (!(globalThis as any).__DEV__ || seen.has(stage)) return;
    seen.add(stage);
    const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
    console.log(`[YETI PERF] ${screen} ${stage} ${Math.round(now - started)}ms`);
  };
}
