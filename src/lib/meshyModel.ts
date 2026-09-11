import type { ModelUrlsPayload } from './api';

export function compactModelUrls(
  u?: Record<string, string | undefined> | null
): ModelUrlsPayload | undefined {
  if (!u) return undefined;
  const o: ModelUrlsPayload = {};
  for (const k of ['glb', 'fbx', 'usdz', 'obj', 'mtl', 'stl'] as const) {
    const v = u[k];
    if (typeof v === 'string' && v) o[k] = v;
  }
  return Object.keys(o).length ? o : undefined;
}
