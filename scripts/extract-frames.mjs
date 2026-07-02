// Frame extraction script for the scroll-driven image sequence.
//
// Uses a bundled static ffmpeg/ffprobe binary (no system install required) to
// pull a set of evenly spaced JPEG frames out of the source video and writes
// them to `public/frames`. A `manifest.json` describing the sequence is emitted
// alongside the frames so the React app can load them without hardcoding.
//
// Usage:
//   node scripts/extract-frames.mjs
//   node scripts/extract-frames.mjs --input video.mp4 --count 120 --width 1280 --quality 4
//
// Flags:
//   --input    Path to the source video (default: first *.mp4 in project root)
//   --count    Approx number of frames to extract (default: 120)
//   --width    Output frame width in px, height keeps aspect ratio (default: source width)
//   --quality  JPEG quality, ffmpeg -q:v scale 2 (best) .. 31 (worst) (default: 4)
//   --out      Output directory (default: public/frames)

import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, rmSync, unlinkSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import ffmpegPath from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = resolve(__dirname, "..");
const ffprobePath = ffprobeStatic.path;

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const key = argv[i];
    if (key.startsWith("--")) {
      const name = key.slice(2);
      const value = argv[i + 1];
      args[name] = value;
      i += 1;
    }
  }
  return args;
}

function findDefaultVideo() {
  const candidates = readdirSync(projectRoot).filter((f) =>
    /\.(mp4|mov|webm|m4v)$/i.test(f)
  );
  if (candidates.length === 0) {
    throw new Error(
      "No video found in project root. Pass one with --input <path>."
    );
  }
  return join(projectRoot, candidates[0]);
}

function probeVideo(input) {
  const result = spawnSync(
    ffprobePath,
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,duration,r_frame_rate",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      input,
    ],
    { encoding: "utf8" }
  );
  if (result.status !== 0) {
    throw new Error(`ffprobe failed: ${result.stderr}`);
  }
  const data = JSON.parse(result.stdout);
  const stream = data.streams?.[0] ?? {};
  const width = Number(stream.width);
  const height = Number(stream.height);
  const duration = Number(stream.duration || data.format?.duration || 0);
  return { width, height, duration };
}

async function run() {
  const args = parseArgs(process.argv);
  const input = args.input ? resolve(args.input) : findDefaultVideo();

  if (!existsSync(input)) {
    throw new Error(`Input video not found: ${input}`);
  }
  if (!ffmpegPath) {
    throw new Error("ffmpeg-static binary not found. Re-run npm install.");
  }

  const { width: srcW, height: srcH, duration } = probeVideo(input);
  if (!duration || !srcW || !srcH) {
    throw new Error("Could not read video metadata.");
  }

  const requestedCount = Math.max(2, Number(args.count) || 120);
  const outWidth = Math.max(2, Number(args.width) || srcW);
  // keep aspect ratio, force even height for the encoder
  const outHeight = Math.round((outWidth / srcW) * srcH / 2) * 2;
  const quality = Math.min(31, Math.max(2, Number(args.quality) || 4));
  const outDir = args.out ? resolve(args.out) : join(projectRoot, "public", "frames");

  // Sampling rate so frames are spread evenly across the entire clip.
  const fps = requestedCount / duration;

  console.log("Source video :", input);
  console.log(`Resolution   : ${srcW}x${srcH}  ->  ${outWidth}x${outHeight}`);
  console.log(`Duration     : ${duration.toFixed(2)}s`);
  console.log(`Frames       : ~${requestedCount}  (fps=${fps.toFixed(3)})`);
  console.log("Output dir   :", outDir);

  // Clean previous frames so re-runs are deterministic.
  if (existsSync(outDir)) {
    rmSync(outDir, { recursive: true, force: true });
  }
  mkdirSync(outDir, { recursive: true });

  // ffmpeg's WebP muxer collapses a "%04d" pattern into a single animated
  // .webp, so we extract JPEGs first, then convert each frame to a standalone
  // .webp with sharp (correct per-frame output + smaller files).
  const jpgPattern = "frame_%04d.jpg";
  const ffmpegArgs = [
    "-y",
    "-i",
    input,
    "-vf",
    `fps=${fps},scale=${outWidth}:${outHeight}:flags=lanczos`,
    "-q:v",
    String(quality),
    "-vsync",
    "vfr",
    join(outDir, jpgPattern),
  ];

  const result = spawnSync(ffmpegPath, ffmpegArgs, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error("ffmpeg frame extraction failed.");
  }

  const jpgs = readdirSync(outDir)
    .filter((f) => /^frame_\d+\.jpg$/i.test(f))
    .sort();

  if (jpgs.length === 0) {
    throw new Error("ffmpeg produced no frames.");
  }

  console.log(`\nConverting ${jpgs.length} frames to WebP…`);
  await Promise.all(
    jpgs.map(async (name) => {
      const jpgPath = join(outDir, name);
      const webpPath = jpgPath.replace(/\.jpg$/i, ".webp");
      await sharp(jpgPath).webp({ quality: 82 }).toFile(webpPath);
      unlinkSync(jpgPath);
    }),
  );

  const frames = readdirSync(outDir)
    .filter((f) => f.endsWith(".webp"))
    .sort();

  // Derive the public web path for the output dir (public/ is served at "/").
  const publicDir = join(projectRoot, "public");
  const relFromPublic = outDir.startsWith(publicDir)
    ? outDir.slice(publicDir.length)
    : outDir.slice(projectRoot.length);
  const urlBase = relFromPublic.replace(/\\/g, "/").replace(/\/$/, "");

  const manifest = {
    generatedAt: new Date().toISOString(),
    source: input.split(/[\\/]/).pop(),
    frameCount: frames.length,
    width: outWidth,
    height: outHeight,
    aspectRatio: outWidth / outHeight,
    duration,
    // URL template relative to the web root (public/ is served at "/").
    urlPattern: `${urlBase}/frame_%04d.webp`,
    frames: frames.map((f) => `${urlBase}/${f}`),
  };

  writeFileSync(join(outDir, "manifest.json"), JSON.stringify(manifest, null, 2));

  console.log(`\nExtracted ${frames.length} frames.`);
  console.log(`Manifest written to ${join(outDir, "manifest.json")}`);
}

run().catch((err) => {
  console.error("\n[extract-frames] Error:", err.message);
  process.exit(1);
});
