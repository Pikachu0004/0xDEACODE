import { apiFetch, apiUrl } from './api';
import type { StudioPublishOptions } from '../components/studio/StudioPublishDialog';

export async function submitWebArPublish(
  projectId: string,
  glbBuffer: ArrayBuffer,
  opts: StudioPublishOptions,
  token: string
): Promise<void> {
  const res = await fetch(apiUrl(`/api/projects/${projectId}/ar-glb`), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/octet-stream',
    },
    body: glbBuffer,
  });
  if (!res.ok) {
    const t = await res.text();
    let msg = t || res.statusText;
    try {
      const j = JSON.parse(t) as { message?: string };
      if (typeof j?.message === 'string' && j.message.trim()) msg = j.message.trim();
    } catch {
      /* use raw body */
    }
    throw new Error(msg);
  }
  await apiFetch(`/api/projects/${projectId}`, {
    method: 'PATCH',
    token,
    body: JSON.stringify({
      arSharePublic: opts.arSharePublic,
      arPageTitle: opts.arPageTitle,
      arPageTagline: opts.arPageTagline,
      arCtaLabel: opts.arCtaLabel,
      arAccentHex: opts.arAccentHex,
      status: 'published',
    }),
  });
}
