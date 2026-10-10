const DB_NAME = "profile-studio-assets";
const STORE_NAME = "assets";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveAsset(file: File): Promise<string> {
  const response = await fetch("/api/assets", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: file.name, type: file.type || "application/octet-stream", size: file.size }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.uploadUrl !== "string" || typeof data.publicUrl !== "string" || typeof data.uploadAuthorization !== "string" || typeof data.uploadApiKey !== "string") {
    throw new Error(data.error || "Pixlo could not prepare this cloud upload.");
  }

  const uploadResponse = await fetch(data.uploadUrl, {
    method: "POST",
    headers: { Authorization: data.uploadAuthorization, apikey: data.uploadApiKey, "Content-Type": file.type || "application/octet-stream", "x-upsert": "false" },
    body: file,
  });
  if (!uploadResponse.ok) {
    const detail = await uploadResponse.json().catch(() => ({}));
    const message = typeof detail.message === "string" ? detail.message : typeof detail.error === "string" ? detail.error : "";
    throw new Error(message || `Cloud upload failed (${uploadResponse.status}). Please try again or use a smaller file.`);
  }
  return data.publicUrl;
}

export async function migrateAssetToCloud(value: string): Promise<string> {
  if (!value.startsWith("idb:")) return value;
  const key = value.slice(4);
  const db = await openDB();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!file) return "";
  const uploadFile = file instanceof File ? file : new File([file], "pixlo-upload", { type: file.type || "application/octet-stream" });
  return saveAsset(uploadFile);
}

export async function loadAsset(value: string): Promise<string> {
  if (!value.startsWith("idb:")) return value;
  const key = value.slice(4);
  const db = await openDB();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return file ? URL.createObjectURL(file) : "";
}

export async function deleteAsset(value: string) {
  if (!value.startsWith("idb:")) return;
  const key = value.slice(4);
  const db = await openDB();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadAssetMedia(value: string): Promise<{ url: string; type: string }> {
  const extensionTypes: Record<string, string> = {
    m4a: "audio/mp4", aac: "audio/aac", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", flac: "audio/flac",
    mp4: "video/mp4", webm: "video/webm", m4v: "video/mp4", mov: "video/quicktime",
  };
  if (!value.startsWith("idb:")) {
    const pathname = value.split(/[?#]/)[0];
    const filename = pathname.slice(pathname.lastIndexOf("/") + 1);
    const extension = filename.includes(".") ? filename.split(".").pop()?.toLowerCase() || "" : "";
    return { url: value, type: extensionTypes[extension] || "" };
  }
  const key = value.slice(4);
  const db = await openDB();
  const file = await new Promise<Blob | undefined>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const request = tx.objectStore(STORE_NAME).get(key);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  db.close();
  if (!file) return { url: "", type: "" };
  const name = file instanceof File ? file.name.toLowerCase() : "";
  const extension = name.split(".").pop() || "";
  const detectedType = extensionTypes[extension] || file.type || "";
  const type = detectedType === "audio/x-m4a" || detectedType === "audio/m4a" ? "audio/mp4" : detectedType;
  const mediaBlob = type && file.type !== type ? new Blob([file], { type }) : file;
  return { url: URL.createObjectURL(mediaBlob), type };
}
