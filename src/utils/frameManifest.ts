export interface FrameManifest {
  frameCount: number;
  width: number;
  height: number;
  aspectRatio: number;
  urlPattern: string;
  frames: string[];
}

const DEFAULT_MANIFEST_URL = "/frames/manifest.json";

const manifestCache = new Map<string, FrameManifest>();
const manifestPromises = new Map<string, Promise<FrameManifest>>();

export async function fetchFrameManifest(
  url: string = DEFAULT_MANIFEST_URL,
): Promise<FrameManifest> {
  const cached = manifestCache.get(url);
  if (cached) return cached;

  const inFlight = manifestPromises.get(url);
  if (inFlight) return inFlight;

  const promise = fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error("missing manifest");
      return res.json() as Promise<FrameManifest>;
    })
    .then((data) => {
      manifestCache.set(url, data);
      return data;
    })
    .finally(() => {
      manifestPromises.delete(url);
    });

  manifestPromises.set(url, promise);
  return promise;
}
