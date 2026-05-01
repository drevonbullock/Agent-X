import fs from "fs";
import path from "path";
import { execSync, execFileSync } from "child_process";
import { generateHyperframesVideo } from "./generate-hyperframes-video.js";
import { transcribeAudio } from "./elevenlabs.js";

const ffmpeg  = process.platform === "linux" ? "/usr/bin/ffmpeg"  : "/opt/homebrew/bin/ffmpeg";
const ffprobe = process.platform === "linux" ? "/usr/bin/ffprobe" : "/opt/homebrew/bin/ffprobe";

// ─── HELPERS ─────────────────────────────────────────────────────────────────

function runFfmpeg(args, label) {
  try {
    execFileSync(ffmpeg, ["-y", ...args], { stdio: "pipe", timeout: 10 * 60 * 1000 });
  } catch (err) {
    throw new Error(`[ffmpeg/${label}] ${err.stderr?.toString()?.slice(0, 200) ?? err.message}`);
  }
}

function tmpPath(suffix) {
  return path.resolve(`generated_imgs/raw-proc-${Date.now()}-${suffix}`);
}

// Extract audio from video as a Buffer for ElevenLabs STT
async function extractAudioBuffer(videoPath) {
  const audioOut = tmpPath("audio.mp3");
  runFfmpeg(["-i", videoPath, "-q:a", "0", "-map", "a", audioOut], "extract-audio");
  const buf = fs.readFileSync(audioOut);
  try { fs.unlinkSync(audioOut); } catch { /* ignore */ }
  return buf;
}

// Build a silence-removal + filler-cut filter string from transcript word timestamps
function buildSilenceCutList(words, totalDuration) {
  const FILLER_WORDS = new Set(["umm", "um", "uh", "like", "you", "know", "so", "just", "basically"]);
  const MIN_GAP_SEC  = 0.5;
  const keepSegments = [];

  let i = 0;
  while (i < words.length) {
    const word = words[i];
    const wordText = word.text?.toLowerCase().replace(/[^a-z]/g, "") ?? "";

    // Skip filler words
    if (FILLER_WORDS.has(wordText)) { i++; continue; }

    // Start a kept segment
    const segStart = Math.max(0, word.start - 0.03);
    let segEnd     = word.end + 0.03;
    i++;

    // Extend segment until gap >= MIN_GAP_SEC or end of words
    while (i < words.length) {
      const next     = words[i];
      const nextText = next.text?.toLowerCase().replace(/[^a-z]/g, "") ?? "";
      const gap      = next.start - words[i - 1].end;

      if (gap >= MIN_GAP_SEC) break;
      if (FILLER_WORDS.has(nextText)) { i++; continue; }

      segEnd = next.end + 0.03;
      i++;
    }

    keepSegments.push({ start: segStart, end: Math.min(segEnd, totalDuration) });
  }

  return keepSegments;
}

function getVideoDuration(videoPath) {
  const out = execFileSync(ffprobe, [
    "-v", "quiet", "-print_format", "json", "-show_format", videoPath,
  ], { encoding: "utf8" });
  return parseFloat(JSON.parse(out).format.duration);
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────

export async function processRawFootage(inputPath, postScript) {
  console.log(`[Agent X] PATH A — Processing raw footage: ${path.basename(inputPath)}`);

  fs.mkdirSync("raw_footage",    { recursive: true });
  fs.mkdirSync("generated_imgs", { recursive: true });

  const timestamp = Date.now();

  // 1 — Extract audio and transcribe via ElevenLabs
  console.log(`[Agent X] Transcribing with ElevenLabs...`);
  let words = [];
  let duration = 60;
  try {
    const audioBuffer = await extractAudioBuffer(inputPath);
    duration = getVideoDuration(inputPath);
    const transcription = await transcribeAudio(audioBuffer);
    words = transcription.words ?? [];
    console.log(`[Agent X] Transcript: ${words.length} words`);
  } catch (err) {
    console.warn(`[Agent X] Transcription failed — keeping full video: ${err.message}`);
  }

  // 2 — Build keep-segment list (silence removal + filler cut)
  const segments = words.length > 0
    ? buildSilenceCutList(words, duration)
    : [{ start: 0, end: duration }];

  // 3 — Extract each segment with 30ms audio fades (lossless copy)
  console.log(`[Agent X] Cutting filler words and silence gaps (${segments.length} segments)...`);
  const segmentFiles = [];
  const listFile = tmpPath("filelist.txt");

  for (let i = 0; i < segments.length; i++) {
    const seg  = segments[i];
    const segDur = seg.end - seg.start;
    if (segDur < 0.1) continue;

    const segOut = tmpPath(`seg${i}.mp4`);
    runFfmpeg([
      "-ss", String(seg.start), "-to", String(seg.end),
      "-i", inputPath,
      "-af", `afade=t=in:st=0:d=0.03,afade=t=out:st=${Math.max(0, segDur - 0.03)}:d=0.03`,
      "-c:v", "libx264", "-crf", "18", "-preset", "fast",
      "-c:a", "aac", "-b:a", "192k",
      segOut,
    ], `seg-${i}`);
    segmentFiles.push(segOut);
  }

  // 4 — Concatenate segments
  const concatOut = tmpPath("concat.mp4");
  const fileListContent = segmentFiles.map(f => `file '${f}'`).join("\n");
  fs.writeFileSync(listFile, fileListContent);
  runFfmpeg(["-f", "concat", "-safe", "0", "-i", listFile, "-c", "copy", concatOut], "concat");

  // 5 — Color grade
  console.log(`[Agent X] Applying color grade...`);
  const gradedOut = tmpPath("graded.mp4");
  runFfmpeg([
    "-i", concatOut,
    "-vf", "eq=contrast=1.1:brightness=0.02:saturation=1.2",
    "-c:v", "libx264", "-crf", "18", "-preset", "fast",
    "-c:a", "copy",
    gradedOut,
  ], "grade");

  // 6 — Burn subtitles (2-word uppercase chunks, white text, black outline)
  console.log(`[Agent X] Burning subtitles...`);
  const srtPath  = tmpPath("subs.srt");
  const srtLines = [];
  let idx = 1;
  let outputOffset = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    const segWords = words.filter(w => w.start >= seg.start && w.end <= seg.end);
    for (let j = 0; j < segWords.length; j += 2) {
      const chunk = segWords.slice(j, j + 2);
      if (!chunk.length) continue;
      const chunkStart = outputOffset + (chunk[0].start - seg.start);
      const chunkEnd   = outputOffset + (chunk[chunk.length - 1].end - seg.start) + 0.1;
      const text       = chunk.map(w => w.text.toUpperCase()).join(" ");
      const toSrtTime  = (s) => {
        const h = Math.floor(s / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = Math.floor(s % 60);
        const ms  = Math.round((s % 1) * 1000);
        return `${String(h).padStart(2,"0")}:${String(m).padStart(2,"0")}:${String(sec).padStart(2,"0")},${String(ms).padStart(3,"0")}`;
      };
      srtLines.push(`${idx}\n${toSrtTime(chunkStart)} --> ${toSrtTime(chunkEnd)}\n${text}\n`);
      idx++;
    }
    outputOffset += (seg.end - seg.start);
  }
  fs.writeFileSync(srtPath, srtLines.join("\n"));

  const subtitledOut = tmpPath("subtitled.mp4");
  try {
    runFfmpeg([
      "-i", gradedOut,
      "-vf", `subtitles='${srtPath}':force_style='FontName=Arial,FontSize=72,Bold=1,PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,BorderStyle=1,Outline=3,Alignment=2,MarginV=80'`,
      "-c:v", "libx264", "-crf", "18", "-preset", "fast",
      "-c:a", "copy",
      subtitledOut,
    ], "subtitles");
  } catch (err) {
    console.warn(`[Agent X] Subtitle burn failed — using graded output: ${err.message}`);
    fs.copyFileSync(gradedOut, subtitledOut);
  }

  // 7 — Motion graphics overlay via Hyperframes
  console.log(`[Agent X] Rendering motion graphics overlay...`);
  let finalOutput = path.resolve(`generated_imgs/final-${timestamp}.mp4`);

  if (postScript && postScript.length > 0) {
    try {
      const overlayPath = await generateHyperframesVideo(postScript, "list_countdown", null, null);
      const compositeOut = path.resolve(`generated_imgs/final-${timestamp}.mp4`);

      runFfmpeg([
        "-i", subtitledOut,
        "-i", overlayPath,
        "-filter_complex", "[0:v][1:v]overlay=0:0",
        "-codec:a", "copy",
        compositeOut,
      ], "composite");

      finalOutput = compositeOut;
      console.log(`[Agent X] Composite done: ${compositeOut}`);
    } catch (err) {
      console.warn(`[Agent X] Overlay composite failed — using clean cut: ${err.message}`);
      fs.copyFileSync(subtitledOut, finalOutput);
    }
  } else {
    fs.copyFileSync(subtitledOut, finalOutput);
  }

  // 8 — Cleanup temp files
  const temps = [concatOut, gradedOut, subtitledOut, listFile, srtPath, ...segmentFiles];
  for (const f of temps) { try { fs.unlinkSync(f); } catch { /* ignore */ } }

  // 9 — Delete source from raw_footage
  try {
    fs.unlinkSync(inputPath);
    console.log(`[Agent X] Source file removed: ${path.basename(inputPath)}`);
  } catch (err) {
    console.warn(`[Agent X] Could not remove source: ${err.message}`);
  }

  const sizeMB = fs.existsSync(finalOutput)
    ? (fs.statSync(finalOutput).size / 1024 / 1024).toFixed(1)
    : '?';
  console.log(`[Agent X] Video ready: ${finalOutput} (${sizeMB} MB)`);
  return finalOutput;
}
