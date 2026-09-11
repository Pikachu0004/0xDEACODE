/** Network Information API (Chromium / some mobile browsers) */
type NetInfo = {
  saveData?: boolean;
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
};

/**
 * Skip heavy autoplay video / defer 3D when user or network asks for lighter payloads.
 */
export function prefersLightMedia(): boolean {
  if (typeof navigator === 'undefined') return false;
  const c = (navigator as Navigator & { connection?: NetInfo }).connection;
  if (c?.saveData) return true;
  const t = c?.effectiveType;
  return t === 'slow-2g' || t === '2g';
}

export function subscribeConnectionChange(cb: () => void): () => void {
  if (typeof navigator === 'undefined') return () => {};
  const c = (navigator as Navigator & { connection?: NetInfo & EventTarget }).connection;
  if (!c || !('addEventListener' in c)) return () => {};
  c.addEventListener('change', cb);
  return () => c.removeEventListener('change', cb);
}
