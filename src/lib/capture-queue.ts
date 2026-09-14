import { api } from "./workspace";
export type CaptureChunk = {
  id: string;
  capsuleId: string;
  interviewId: string;
  sequence: number;
  blob: Blob;
  createdAt: number;
  complete?: number;
};
const database = "synapse-pending-capture";
async function db(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(database, 1);
    request.onupgradeneeded = () =>
      request.result.createObjectStore("chunks", { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Local capture recovery storage is unavailable."));
  });
}
async function transaction<T>(
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const connection = await db();
  return new Promise((resolve, reject) => {
    const tx = connection.transaction("chunks", mode);
    const request = operation(tx.objectStore("chunks"));
    tx.oncomplete = () => {
      connection.close();
      resolve(request.result);
    };
    tx.onerror = () => {
      connection.close();
      reject(tx.error || new Error("Could not save the recording chunk."));
    };
    tx.onabort = () => {
      connection.close();
      reject(new Error("Recording storage was interrupted."));
    };
  });
}
export async function saveChunk(chunk: CaptureChunk) {
  await transaction("readwrite", (store) => store.put(chunk));
}
export async function pendingChunks(capsuleId: string) {
  const all = await transaction<CaptureChunk[]>("readonly", (store) =>
    store.getAll(),
  );
  return all
    .filter((c) => c.capsuleId === capsuleId)
    .sort((a, b) => a.createdAt - b.createdAt || a.sequence - b.sequence);
}
async function uploadChunk(chunk: CaptureChunk) {
  if (chunk.complete !== undefined) {
    await api(
      `/capsules/${chunk.capsuleId}/interviews/${chunk.interviewId}/complete`,
      {
        method: "POST",
        body: JSON.stringify({
          segments: chunk.complete,
          idempotencyKey: chunk.id,
        }),
      },
    );
  } else {
    const digest = await crypto.subtle.digest(
      "SHA-256",
      await chunk.blob.arrayBuffer(),
    );
    const sha256 = Array.from(new Uint8Array(digest), (b) =>
      b.toString(16).padStart(2, "0"),
    ).join("");
    const upload = await api<{ url: string; objectKey: string }>(
      `/capsules/${chunk.capsuleId}/sources/upload-url`,
      {
        method: "POST",
        body: JSON.stringify({
          interviewId: chunk.interviewId,
          sequence: chunk.sequence,
          contentType: chunk.blob.type,
          size: chunk.blob.size,
          sha256,
          idempotencyKey: chunk.id,
        }),
      },
    );
    const response = await fetch(upload.url, {
      method: "PUT",
      body: chunk.blob,
      headers: { "Content-Type": chunk.blob.type },
      signal: AbortSignal.timeout(60000),
    });
    if (!response.ok)
      throw new Error(
        "An audio chunk could not be uploaded. It is saved on this device for retry.",
      );
    await api(
      `/capsules/${chunk.capsuleId}/interviews/${chunk.interviewId}/segments`,
      {
        method: "POST",
        body: JSON.stringify({
          objectKey: upload.objectKey,
          sequence: chunk.sequence,
          sha256,
          idempotencyKey: chunk.id,
        }),
      },
    );
  }
  await transaction("readwrite", (store) => store.delete(chunk.id));
}
const uploading = new Map<string, Promise<void>>();
export function flushCapture(capsuleId: string): Promise<void> {
  const existing = uploading.get(capsuleId);
  if (existing) return existing;
  const task = (async () => {
    while (true) {
      const chunks = await pendingChunks(capsuleId);
      if (!chunks.length) return;
      for (const chunk of chunks) {
        let failure: unknown;
        for (let attempt = 0; attempt < 3; attempt++) {
          try {
            await uploadChunk(chunk);
            failure = undefined;
            break;
          } catch (err) {
            failure = err;
            if (attempt < 2)
              await new Promise((resolve) =>
                setTimeout(resolve, Math.min(4000, 500 * 2 ** attempt)),
              );
          }
        }
        if (failure) throw failure;
      }
    }
  })().finally(() => uploading.delete(capsuleId));
  uploading.set(capsuleId, task);
  return task;
}
