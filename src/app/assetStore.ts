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
  const form = new FormData();
  form.append("file", file);
  const response = await fetch("/api/assets", { method: "POST", credentials: "include", body: form });
  const data = await response.json().catch(() => ({}));
  if (!response.ok || typeof data.url !== "string") {
    throw new Error(data.error || "The file could not be uploaded to cloud storage.");
  }
  return data.url;
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
  if (!value.startsWith("idb:")) return { url: value, type: "" };
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
  const extensionTypes: Record<string, string> = {
    m4a: "audio/mp4", aac: "audio/aac", mp3: "audio/mpeg", wav: "audio/wav", ogg: "audio/ogg", oga: "audio/ogg", opus: "audio/ogg", flac: "audio/flac",
    mp4: "video/mp4", webm: "video/webm", m4v: "video/mp4", mov: "video/quicktime",
  };
  const detectedType = extensionTypes[extension] || file.type || "";
  const type = detectedType === "audio/x-m4a" || detectedType === "audio/m4a" ? "audio/mp4" : detectedType;
  const mediaBlob = type && file.type !== type ? new Blob([file], { type }) : file;
  return { url: URL.createObjectURL(mediaBlob), type };
}
