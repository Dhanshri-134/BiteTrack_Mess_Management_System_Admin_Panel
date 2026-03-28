import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { FileOpener } from "@capacitor-community/file-opener";

function sanitizeFileName(fileName, fallback = "download") {
  const normalized = String(fileName || fallback).trim();
  return normalized.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_") || fallback;
}

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function saveNativeBase64(base64Data, fileName, contentType) {
  const safeName = sanitizeFileName(fileName);
  const path = `downloads/${Date.now()}-${safeName}`;

  await Filesystem.writeFile({
    path,
    data: base64Data,
    directory: Directory.Cache,
    recursive: true,
  });

  const fileUri = await Filesystem.getUri({
    path,
    directory: Directory.Cache,
  });

  try {
    await FileOpener.open({
      filePath: fileUri.uri,
      contentType,
      openWithDefault: true,
    });
  } catch (openError) {
    if (typeof window !== "undefined") {
      window.open(Capacitor.convertFileSrc(fileUri.uri), "_blank", "noopener");
    } else {
      throw openError;
    }
  }

  return fileUri;
}

async function saveNativeBlob(blob, fileName, contentType) {
  const dataUrl = await blobToDataUrl(blob);
  const base64Data = dataUrl.split(",")[1] || "";
  return saveNativeBase64(base64Data, fileName, contentType);
}

function saveBrowserBlob(blob, fileName) {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = sanitizeFileName(fileName);
  anchor.rel = "noopener";
  anchor.style.display = "none";

  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}

export async function saveBlobFile(blob, fileName, contentType = blob?.type || "application/octet-stream") {
  if (!blob) {
    throw new Error("No file data available");
  }

  if (Capacitor.isNativePlatform()) {
    return saveNativeBlob(blob, fileName, contentType);
  }

  saveBrowserBlob(blob, fileName);
  return null;
}

export async function saveJsPdfDocument(doc, fileName) {
  if (Capacitor.isNativePlatform()) {
    const dataUri = doc.output("datauristring");
    const base64Data = String(dataUri || "").split(",")[1] || "";

    if (!base64Data) {
      throw new Error("No PDF data available");
    }

    return saveNativeBase64(base64Data, fileName, "application/pdf");
  }

  const blob = doc.output("blob");
  return saveBlobFile(blob, fileName, "application/pdf");
}

export async function downloadFileFromUrl(url, options = {}) {
  const { fileName = "download", headers = {} } = options;
  try {
    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(`Download failed with status ${response.status}`);
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const blob = await response.blob();

    return saveBlobFile(blob, fileName, contentType);
  } catch (error) {
    if (
      Capacitor.isNativePlatform() &&
      typeof window !== "undefined" &&
      Object.keys(headers).length === 0 &&
      /^https?:\/\//i.test(String(url || ""))
    ) {
      window.open(url, "_blank", "noopener");
      return null;
    }

    throw error;
  }
}
