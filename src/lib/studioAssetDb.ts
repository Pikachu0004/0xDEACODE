import type { Project } from '../store/useAppStore';

const DB_NAME = 'visiarise-studio-assets';
const DB_VERSION = 1;
const STORE = 'assets';

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

const key = {
  main: (projectId: string) => `${projectId}::main`,
  logo: (projectId: string) => `${projectId}::logo`,
  extra: (projectId: string, extraId: string) => `${projectId}::extra:${extraId}`,
};

async function putEntry(k: string, value: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function getEntry(k: string): Promise<string | undefined> {
  const db = await openDb();
  const v = await new Promise<string | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const r = tx.objectStore(STORE).get(k);
    r.onsuccess = () => resolve(r.result as string | undefined);
    r.onerror = () => reject(r.error);
  });
  db.close();
  return v;
}

async function delEntry(k: string): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(k);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Remove IDB blobs for a project (e.g. on logout). */
export async function clearStudioAssetsForProject(projectId: string): Promise<void> {
  const db = await openDb();
  const prefix = `${projectId}::`;
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const k = String(cursor.key);
      if (k.startsWith(prefix)) cursor.delete();
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function clearAllStudioAssets(): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function deleteOrphanedExtraSlots(projectId: string, keep: Set<string>): Promise<void> {
  const prefix = `${projectId}::extra:`;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    const store = tx.objectStore(STORE);
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (!cursor) return;
      const k = String(cursor.key);
      if (k.startsWith(prefix)) {
        const extraId = k.slice(prefix.length);
        if (!keep.has(extraId)) cursor.delete();
      }
      cursor.continue();
    };
    req.onerror = () => reject(req.error);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

/** Persist heavy data URLs to IndexedDB; keep localStorage small. */
export async function persistProjectHeavyAssets(projectId: string, p: Project): Promise<void> {
  try {
    if (p.modelDataUrl) {
      await putEntry(key.main(projectId), p.modelDataUrl);
    } else {
      await delEntry(key.main(projectId));
    }
    if (p.logoDataUrl) {
      await putEntry(key.logo(projectId), p.logoDataUrl);
    } else {
      await delEntry(key.logo(projectId));
    }
    const extras = p.studioExtras || [];
    await deleteOrphanedExtraSlots(
      projectId,
      new Set(extras.map((e) => e.id))
    );
    for (const ex of extras) {
      const k = key.extra(projectId, ex.id);
      if (ex.modelDataUrl) {
        await putEntry(k, ex.modelDataUrl);
      } else {
        await delEntry(k);
      }
    }
  } catch (e) {
    console.warn('[VisiARise] IndexedDB asset sync failed', e);
  }
}

/** Load assets from IDB into a partial project update. */
export async function loadProjectHeavyAssets(p: Project): Promise<Partial<Project>> {
  const out: Partial<Project> = {};
  const [main, logo] = await Promise.all([
    getEntry(key.main(p.id)),
    getEntry(key.logo(p.id)),
  ]);
  if (main) out.modelDataUrl = main;
  if (logo) out.logoDataUrl = logo;
  if (p.studioExtras?.length) {
    const nextExtras = await Promise.all(
      p.studioExtras.map(async (ex) => {
        const blob = await getEntry(key.extra(p.id, ex.id));
        return blob ? { ...ex, modelDataUrl: blob } : { ...ex };
      })
    );
    out.studioExtras = nextExtras;
  }
  return out;
}
