// Render single frames of a composition from ONE bundle, for quick visual checks
// before paying for a full render.
//   node preview-stills.mjs <CompositionId> <props.json> <outDir> <frame> [frame...]
import fs from "fs";
import path from "path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";

const [comp, propsFile, outDir, ...frames] = process.argv.slice(2);
if (!comp || !propsFile || !outDir || !frames.length) throw new Error("usage: preview-stills.mjs <Comp> <props.json> <outDir> <frame...>");
const inputProps = JSON.parse(fs.readFileSync(propsFile, "utf8"));
const serveUrl = await bundle({ entryPoint: path.resolve("src/index.ts") });
const composition = await selectComposition({ serveUrl, id: comp, inputProps });
fs.mkdirSync(outDir, { recursive: true });
for (const f of frames.map(Number)) {
  const output = path.join(outDir, `f${String(f).padStart(3, "0")}.jpg`);
  await renderStill({ composition, serveUrl, output, frame: f, inputProps, imageFormat: "jpeg", jpegQuality: 88, timeoutInMilliseconds: 120000 });
  console.log(`still ${f} -> ${output}`);
}
process.exit(0);
