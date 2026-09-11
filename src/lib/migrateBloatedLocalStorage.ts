import type { Project } from '../store/useAppStore';
import { persistProjectHeavyAssets } from './studioAssetDb';

const STORAGE_KEY = 'visiarise-storage-v4';

/** Remove heavy data URLs from project shape before writing to localStorage. */
function slimProject(p: Project): Project {
  return {
    ...p,
    modelDataUrl: undefined,
    logoDataUrl: undefined,
    studioExtras: p.studioExtras?.map((e) => ({ ...e, modelDataUrl: undefined })),
  };
}

/**
 * If localStorage was filled with base64 GLBs, push blobs to IndexedDB and rewrite a slim JSON
 * so the next persist write won't throw QuotaExceededError.
 */
export async function migrateBloatedLocalStorageToIdb(): Promise<void> {
  if (typeof window === 'undefined' || !window.localStorage) return;

  let raw: string | null;
  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch {
    return;
  }
  if (!raw) return;

  let envelope: { state?: { projects?: Project[]; currentProject?: Project | null }; version?: number };
  try {
    envelope = JSON.parse(raw);
  } catch {
    return;
  }

  const state = envelope.state;
  if (!state?.projects?.length) return;

  const looksHeavy =
    state.projects.some(
      (p) =>
        (p.modelDataUrl && p.modelDataUrl.length > 50_000) ||
        (p.logoDataUrl && p.logoDataUrl.length > 20_000) ||
        p.studioExtras?.some((e) => e.modelDataUrl && e.modelDataUrl.length > 50_000)
    ) ||
    raw.length > 4_500_000;

  if (!looksHeavy) return;

  try {
    for (const p of state.projects) {
      await persistProjectHeavyAssets(p.id, p);
    }
    if (state.currentProject) {
      await persistProjectHeavyAssets(state.currentProject.id, state.currentProject);
    }

    const slimProjects = state.projects.map(slimProject);
    const slimCurrent = state.currentProject ? slimProject(state.currentProject) : state.currentProject;

    const newState = {
      ...state,
      projects: slimProjects,
      currentProject: slimCurrent,
    };

    const next = JSON.stringify({
      state: newState,
      version: envelope.version ?? 0,
    });

    localStorage.setItem(STORAGE_KEY, next);
  } catch (e) {
    console.warn('[VisiARise] Could not migrate storage to IndexedDB; try clearing site data.', e);
  }
}
