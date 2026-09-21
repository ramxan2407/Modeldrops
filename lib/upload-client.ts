"use client";
function send(
  method: string,
  url: string,
  body: XMLHttpRequestBodyInit,
  progress: (n: number) => void,
  headers: Record<string, string> = {},
) {
  return new Promise<string>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.timeout = 120000;
    for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onerror = () =>
      reject(new Error("Upload connection lost. Please try again."));
    xhr.ontimeout = () =>
      reject(new Error("Upload timed out. Please try again."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.responseText);
      else {
        let message = "Upload failed. Please try again.";
        try {
          message = JSON.parse(xhr.responseText).error || message;
        } catch {}
        reject(new Error(message));
      }
    };
    xhr.send(body);
  });
}
export async function uploadFile(
  url: string,
  file: Blob,
  progress: (n: number) => void = () => {},
  multipart = false,
): Promise<{ id: string }> {
  const init = await fetch("/api/transfers", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ target: url, size: file.size }),
  });
  const transfer = (await init.json()) as {
    direct?: boolean;
    id: string;
    url: string;
    error?: string;
  };
  if (!init.ok) throw new Error(transfer.error || "Could not prepare upload.");
  if (transfer.direct) {
    await send("PUT", transfer.url, file, (n) => progress(Math.min(95, n)), {
      "Content-Type": "application/octet-stream",
    });
    const result = await send("POST", url, "", () => {}, {
      "Content-Type": "application/octet-stream",
      "x-upload-transfer": transfer.id,
    });
    progress(100);
    return JSON.parse(result);
  }
  const body = multipart ? new FormData() : file;
  if (body instanceof FormData) body.append("file", file);
  return JSON.parse(
    await send(
      "POST",
      url,
      body,
      progress,
      multipart ? {} : { "Content-Type": "application/octet-stream" },
    ),
  );
}
