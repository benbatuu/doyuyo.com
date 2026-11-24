"use client";

import { useState } from "react";
import { UPLOAD_ACCEPT, UPLOAD_MAX_BYTES } from "@/lib/media";
import type { MediaDTO } from "./types";

export type UploadJob = { id: string; name: string; progress: number; error?: string; done?: boolean };

/** Reads width/height in the browser so the server needs no image library. */
function dimensions(file: File): Promise<{ width?: number; height?: number }> {
  const url = URL.createObjectURL(file);
  const done = (r: { width?: number; height?: number }) => (URL.revokeObjectURL(url), r);
  if (file.type.startsWith("image/")) {
    return new Promise((res) => {
      const img = new Image();
      img.onload = () => res(done({ width: img.naturalWidth, height: img.naturalHeight }));
      img.onerror = () => res(done({}));
      img.src = url;
    });
  }
  if (file.type.startsWith("video/")) {
    return new Promise((res) => {
      const v = document.createElement("video");
      v.preload = "metadata";
      v.onloadedmetadata = () => res(done({ width: v.videoWidth, height: v.videoHeight }));
      v.onerror = () => res(done({}));
      v.src = url;
    });
  }
  return Promise.resolve(done({}));
}

function send(file: File, dims: { width?: number; height?: number }, folder: string | null, onProgress: (p: number) => void) {
  return new Promise<{ item: MediaDTO; duplicate?: boolean }>((resolve, reject) => {
    const fd = new FormData();
    fd.append("file", file);
    if (dims.width) fd.append("width", String(dims.width));
    if (dims.height) fd.append("height", String(dims.height));
    if (folder) fd.append("folder", folder);
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/media");
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      let body: { item?: MediaDTO; duplicate?: boolean; error?: string } = {};
      try {
        body = JSON.parse(xhr.responseText);
      } catch {}
      if (xhr.status >= 200 && xhr.status < 300 && body.item) resolve({ item: body.item, duplicate: body.duplicate });
      else reject(new Error(body.error ?? "Yüklenemedi"));
    };
    xhr.onerror = () => reject(new Error("Bağlantı hatası"));
    xhr.send(fd);
  });
}

export function useUpload(onUploaded: (item: MediaDTO) => void) {
  const [jobs, setJobs] = useState<UploadJob[]>([]);
  const patch = (id: string, p: Partial<UploadJob>) => setJobs((js) => js.map((j) => (j.id === id ? { ...j, ...p } : j)));
  const accepted = new Set(UPLOAD_ACCEPT.split(","));

  const upload = async (files: FileList | File[], folder: string | null = null) => {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      setJobs((js) => [...js, { id, name: file.name, progress: 0 }]);
      if (!accepted.has(file.type)) {
        patch(id, { error: "Desteklenmeyen tür" });
        continue;
      }
      if (file.size > UPLOAD_MAX_BYTES) {
        patch(id, { error: "50 MB'tan büyük" });
        continue;
      }
      try {
        const { item } = await send(file, await dimensions(file), folder, (p) => patch(id, { progress: p }));
        patch(id, { progress: 100, done: true });
        onUploaded(item);
        setTimeout(() => setJobs((js) => js.filter((j) => j.id !== id)), 1500);
      } catch (e) {
        patch(id, { error: e instanceof Error ? e.message : "Yüklenemedi" });
      }
    }
  };

  return { jobs, upload, clearErrors: () => setJobs((js) => js.filter((j) => !j.error)) };
}
