import { apiFetch, TripoTaskPayload, TripoGenerateResponse, TripoTaskStatusResponse } from './api';
import { useAppStore } from '../store/useAppStore';

export type { TripoTaskPayload };

export async function createTripoTextTask(prompt: string, poly: 'low' | 'medium' | 'high') {
  const token = useAppStore.getState().user?.token;
  if (!token) throw new Error('You must be signed in to generate models.');

  const res = await apiFetch<TripoGenerateResponse>('/api/tripo/generate', {
    method: 'POST',
    token,
    body: JSON.stringify({
      prompt: prompt.trim().slice(0, 600),
      poly_budget: poly,
    }),
  });

  return res.task.taskId;
}

export async function createTripoImageTask(imageDataUrl: string, poly: 'low' | 'medium' | 'high') {
  const token = useAppStore.getState().user?.token;
  if (!token) throw new Error('You must be signed in to generate models.');

  const res = await apiFetch<TripoGenerateResponse>('/api/tripo/generate-from-image', {
    method: 'POST',
    token,
    body: JSON.stringify({
      image_data_url: imageDataUrl,
      poly_budget: poly,
    }),
  });

  return res.task.taskId;
}

export async function pollTripoTask(
  taskId: string,
  prompt: string,
  opts?: { onProgress?: (pct: number) => void; maxAttempts?: number }
): Promise<TripoTaskPayload> {
  const token = useAppStore.getState().user?.token;
  if (!token) throw new Error('You must be signed in to check task status.');

  const maxAttempts = opts?.maxAttempts ?? 120;
  
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const res = await apiFetch<TripoTaskStatusResponse>(`/api/tripo/task/${encodeURIComponent(taskId)}`, {
      method: 'GET',
      token,
    });
    
    const task = res.task;
    opts?.onProgress?.(Math.min(100, Math.max(0, task.progress ?? 0)));
    
    const status = (task.status || '').toLowerCase();
    
    if (['success', 'succeeded', 'failed', 'cancelled', 'expired'].includes(status)) {
      if (status !== 'success' && status !== 'succeeded') {
        throw new Error(task.errorMessage || `Tripo task ${status}.`);
      }
      opts?.onProgress?.(100);
      return task;
    }
    
    await new Promise((resolve) => setTimeout(resolve, 2500));
  }
  
  throw new Error('Tripo task timed out. Check your dashboard and try again.');
}
