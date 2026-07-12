/** Client-side SHA-256 for duplicate file detection before upload. */

export async function sha256Hex(data: ArrayBuffer | Blob | File): Promise<string> {
  const buffer = data instanceof ArrayBuffer ? data : await data.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function sha256Text(text: string): Promise<string> {
  const encoded = new TextEncoder().encode(text);
  return sha256Hex(encoded.buffer);
}
