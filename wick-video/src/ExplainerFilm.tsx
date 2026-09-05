import React from "react";
import {
  AbsoluteFill, Audio, Img, Series,
  interpolate, spring, useCurrentFrame, useVideoConfig, staticFile,
} from "remotion";
import { z } from "zod";

// ─── THE EXPLAINER FILM ──────────────────────────────────────────────────────
// Dre, 2026-09-04: "Kurzgesagt, Vox, Johnny Harris — they animate illustrations
// with aggressive camera work. yes exactly."
//
// That is the whole architecture. The look does NOT come from generating video
// for every shot — at 32.5 credits a clip that is unaffordable and, more to the
// point, it is not how those channels work. It comes from:
//
//   1. AGGRESSIVE CAMERA on still illustrations. Every shot is pushing,
//      pulling, or drifting. Nothing sits still, ever. This is the single
//      biggest contributor to the feel.
//   2. PARALLAX. Foreground art and background move at different rates, so a
//      flat illustration reads as depth.
//   3. HARD CUT RHYTHM cut to the narration, not to a constant.
//   4. TEXT AS A GRAPHIC ELEMENT that arrives with weight and leaves.
//   5. SFX ON EVERY TRANSITION. Silence between beats is what makes an edit
//      feel amateur.
//
// A shot marked motion:"video" swaps its still for a generated clip; everything
// else is identical. So the film renders complete with zero video credits, and
// gets better shot by shot as clips are added.

const INK = "#070c18";
const AMBER = "#F5A524";
const CREAM = "#ffe9c4";
const RED = "#ff5470";
const GREEN = "#3ddc84";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");
const resolve = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));

export const filmSchema = z.object({
  title: z.string(),
  chapters: z.array(z.string()),
  shots: z.array(z.object({
    id: z.string(),
    chapter: z.number(),
    motion: z.enum(["still", "video", "diagram"]),
    vo: z.string(),
    onScreen: z.string(),
    camera: z.enum(["slowPush", "slowPull", "punchIn", "driftLeft", "driftRight", "static"]),
    art: z.string().optional(),
    diagram: z.string().optional(),
    sfx: z.string().optional(),
    transition: z.enum(["push", "wipe", "matchCut", "dip"]).optional(),
    asset: z.string().nullable().optional(),   // filename once generated
    frames: z.number().optional(),             // set by the voiceover pass
  })),
  diagrams: z.record(z.any()),
  hasVoice: z.boolean().optional(),
  hasSfx: z.boolean().optional(),
});
export type FilmProps = z.infer<typeof filmSchema>;

// ─── CAMERA ──────────────────────────────────────────────────────────────────
// One move per shot, always running. `depth` scales the move so a background
// layer travels less than a foreground one — that difference IS the parallax.
function useCamera(kind: string, depth = 1) {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = interpolate(frame, [0, durationInFrames], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  // Ease so the move decelerates rather than tracking linearly, which is what
  // makes it read as a camera and not a CSS transition.
  const e = 1 - Math.pow(1 - p, 2);

  switch (kind) {
    case "slowPush":  return { scale: 1.06 + e * 0.16 * depth, x: 0, y: -e * 14 * depth };
    case "slowPull":  return { scale: 1.30 - e * 0.16 * depth, x: 0, y: e * 10 * depth };
    case "punchIn":   return { scale: 1.02 + Math.min(1, e * 2.4) * 0.22 * depth, x: 0, y: 0 };
    case "driftLeft": return { scale: 1.16, x: -e * 90 * depth, y: -e * 8 * depth };
    case "driftRight":return { scale: 1.16, x: e * 90 * depth, y: -e * 8 * depth };
    default:          return { scale: 1.08 + e * 0.04 * depth, x: 0, y: 0 };
  }
}

// ─── PLATE: the illustration or clip, under camera ───────────────────────────
const Plate: React.FC<{ shot: FilmProps["shots"][number] }> = ({ shot }) => {
  const cam = useCamera(shot.camera, 1);
  const bg = useCamera(shot.camera, 0.42);   // background lags → parallax
  const frame = useCurrentFrame();
  const src = shot.asset ? resolve(shot.asset) : null;

  return (
    <AbsoluteFill style={{ background: INK, overflow: "hidden" }}>
      {/* graded ground, moving slower than the subject */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 120% 70% at 50% 42%, #16233f 0%, #0b1222 48%, #05080f 82%)",
        transform: `scale(${bg.scale}) translate(${bg.x}px, ${bg.y}px)`,
      }} />
      {src ? (
        <AbsoluteFill style={{
          transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`,
        }}>
          <Img src={src} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </AbsoluteFill>
      ) : shot.motion === "diagram" ? null : (
        // PLACEHOLDER — the film is fully watchable before any credits are
        // spent, so timing and edit can be judged now and art dropped in later.
        // Diagram shots draw their own content, so they never get one.
        <AbsoluteFill style={{
          justifyContent: "center", alignItems: "center",
          transform: `scale(${cam.scale}) translate(${cam.x}px, ${cam.y}px)`,
        }}>
          <div style={{
            width: 640, height: 640, borderRadius: 26,
            background: "linear-gradient(160deg, rgba(255,233,196,.07), rgba(255,233,196,.02))",
            boxShadow: "inset 0 0 0 1px rgba(255,233,196,.10), 0 30px 80px rgba(0,0,0,.5)",
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center", padding: 44, gap: 16,
          }}>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 26,
              letterSpacing: 4, color: "rgba(245,165,36,.7)",
            }}>{shot.motion === "video" ? "ANIMATED SHOT" : "ILLUSTRATION"}</div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 30, lineHeight: 1.35,
              color: "rgba(255,233,196,.5)", textAlign: "center",
            }}>{(shot.art ?? "").slice(0, 150)}</div>
          </div>
        </AbsoluteFill>
      )}
      {/* light pool + vignette keep the type readable over any art */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 60% 36% at 50% 42%, rgba(255,214,150,.07), transparent 72%)",
      }} />
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(4,7,15,.62) 0%, rgba(4,7,15,.06) 30%, rgba(4,7,15,.22) 54%, rgba(4,7,15,.88) 100%)",
      }} />
    </AbsoluteFill>
  );
};

// ─── DIAGRAMS ────────────────────────────────────────────────────────────────
// The bar builds part by part across consecutive shots, so the viewer watches
// the same paycheck being carved up rather than seeing four unrelated charts.
const SplitBar: React.FC<{ spec: any; carried?: number }> = ({ spec, carried = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parts = spec.parts ?? [];
  const total = spec.total ?? 1;

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 76px" }}>
      <div style={{
        fontFamily: "Anton, Impact, sans-serif", fontSize: 130, color: "#fff",
        textAlign: "center", marginBottom: 30,
        textShadow: "0 8px 34px rgba(0,0,0,.8)",
      }}>{money(total)}</div>

      <div style={{
        display: "flex", height: 88, borderRadius: 8, overflow: "hidden",
        background: "rgba(255,233,196,.07)", marginBottom: 40,
        boxShadow: "0 12px 40px rgba(0,0,0,.5)",
      }}>
        {parts.map((p: any, i: number) => {
          // MATCH CUT: segments the previous shot already showed are drawn at
          // full width immediately, so the bar appears continuous across the
          // cut and only the NEW slice animates in.
          const w = i < carried ? 1 : spring({ frame: frame - 4 - (i - carried) * 8, fps, config: { damping: 200 } });
          return (
            <div key={i} style={{
              width: `${(p.amount / total) * 100 * w}%`,
              background: p.accent
                ? `linear-gradient(180deg, ${AMBER}, #c07d14)`
                : `rgba(255,233,196,${0.34 - i * 0.06})`,
              borderRight: "3px solid rgba(4,7,15,.9)",
            }} />
          );
        })}
      </div>

      {parts.map((p: any, i: number) => {
        const o = i < carried ? 1 : spring({ frame: frame - 10 - (i - carried) * 8, fps, config: { damping: 200 } });
        return (
          <div key={i} style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            fontFamily: "'DM Sans', sans-serif", fontSize: 48, marginBottom: 18,
            color: p.accent ? AMBER : CREAM, opacity: o,
            transform: `translateX(${(1 - o) * -22}px)`,
            textShadow: "0 3px 16px rgba(0,0,0,.85)",
          }}>
            <span>{p.label}</span>
            <span style={{ fontWeight: 800 }}>{money(p.amount)}</span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const CompareBars: React.FC<{ spec: any }> = ({ spec }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rows = [
    { ...spec.a, year: spec.aYear, color: RED },
    { ...spec.b, year: spec.bYear, color: GREEN },
  ];
  const max = Math.max(spec.aYear, spec.bYear) || 1;

  return (
    <AbsoluteFill style={{ justifyContent: "center", padding: "0 76px" }}>
      {rows.map((r, i) => {
        const g = spring({ frame: frame - 10 - i * 16, fps, config: { damping: 200 } });
        return (
          <div key={i} style={{ marginBottom: 54 }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              fontFamily: "'DM Sans', sans-serif", fontSize: 44, color: CREAM, marginBottom: 12,
            }}>
              <span>{r.label}</span>
              <span style={{ color: r.color, fontWeight: 800 }}>{money(r.amount)}/mo</span>
            </div>
            <div style={{ height: 62, background: "rgba(255,233,196,.07)", borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                width: `${(r.year / max) * 100 * g}%`, height: "100%",
                background: `linear-gradient(90deg, ${r.color}, ${r.color}bb)`,
                boxShadow: `0 0 30px ${r.color}55`,
              }} />
            </div>
            <div style={{
              fontFamily: "Anton, Impact, sans-serif", fontSize: 76, color: r.color, marginTop: 10,
            }}>{money(r.year * g)}</div>
          </div>
        );
      })}
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 38, color: "rgba(255,233,196,.6)",
        textAlign: "center",
      }}>{spec.note}</div>
    </AbsoluteFill>
  );
};

// ─── ON-SCREEN TEXT ──────────────────────────────────────────────────────────
// Arrives with weight, holds, then leaves before the cut. Text that lingers
// into the next shot is the classic amateur tell.
const Caption: React.FC<{ text: string }> = ({ text }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const inS = spring({ frame: frame - 3, fps, config: { damping: 14, mass: 0.6, stiffness: 100 } });
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames - 2], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const parts = text.split(/(\$[\d,]+)/g);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 210 }}>
      <div style={{
        fontFamily: "Anton, Impact, sans-serif", fontSize: 92, lineHeight: 1.04,
        color: "#fff", textAlign: "center", textTransform: "uppercase",
        opacity: Math.min(1, inS) * out,
        transform: `translateY(${(1 - Math.min(1, inS)) * 34}px)`,
        textShadow: "0 8px 38px rgba(0,0,0,.95)", padding: "0 70px",
      }}>
        {parts.map((p, i) => (
          <span key={i} style={{ color: /^\$/.test(p) ? AMBER : "#fff" }}>{p}</span>
        ))}
      </div>
    </AbsoluteFill>
  );
};

// ─── CHROME ──────────────────────────────────────────────────────────────────
const Chrome: React.FC<{ chapters: string[]; index: number }> = ({ chapters, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div style={{
        position: "absolute", top: 0, left: 0, height: 5,
        width: `${(frame / durationInFrames) * 100}%`,
        background: `linear-gradient(90deg, ${AMBER}, #ffd479)`,
        boxShadow: "0 0 16px rgba(245,165,36,.6)",
      }} />
      <div style={{
        position: "absolute", top: 38, left: 44, display: "flex", alignItems: "center", gap: 13,
      }}>
        <div style={{ width: 9, height: 9, background: AMBER, borderRadius: 2 }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 24,
          letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,233,196,.8)",
        }}>{chapters[index] ?? ""}</span>
      </div>
    </AbsoluteFill>
  );
};

// ─── TRANSITIONS ─────────────────────────────────────────────────────────────
// Hard cuts with a flash were the weak link. These are the four transitions
// that actually appear in professional explainers, each earning its place:
//
//   push    the new shot drives the old one off. Directional, energetic, reads
//           as "next point" — used when the argument advances.
//   wipe    a hard-edged band sweeps the frame and the new shot is behind it.
//           Graphic and confident; used at the turn from problem to solution.
//   matchCut the diagram PERSISTS and only the new segment animates. This is
//           the strongest cut in the film: the viewer never loses the bar, so
//           four shots read as one continuous argument rather than four charts.
//   dip     a fast dip through black. Used once, before the payoff, because a
//           beat of nothing makes the next thing land harder.
//
// Implemented as an entry transform on the incoming shot rather than a
// cross-fade, because Series cuts hard and an entry move is what sells motion.
type Trans = "push" | "wipe" | "matchCut" | "dip";

function useTransition(kind: Trans) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // 10 frames — long enough to read, short enough to never feel like waiting.
  const p = spring({ frame, fps, config: { damping: 200, stiffness: 120, mass: 0.5 } });
  const done = p > 0.995;

  switch (kind) {
    case "push":
      return { style: { transform: `translateY(${(1 - p) * 100}%)` }, band: null, dip: 0, done };
    case "wipe":
      return {
        style: { clipPath: `inset(0 0 ${(1 - p) * 100}% 0)` },
        band: p < 1 ? p : null, dip: 0, done,
      };
    case "dip":
      return { style: {}, band: null, dip: interpolate(frame, [0, 5, 11], [1, 0.85, 0], {
        extrapolateLeft: "clamp", extrapolateRight: "clamp" }), done };
    default:
      return { style: {}, band: null, dip: 0, done };   // matchCut: no move at all
  }
}

// ─── SHOT ────────────────────────────────────────────────────────────────────
// Whip-flash on entry: a one-frame light wipe at the cut. Cheap, and it is what
// makes consecutive shots feel edited rather than sequenced.
const Shot: React.FC<{ shot: FilmProps["shots"][number]; diagrams: any; chapters: string[]; voice?: boolean; sfx?: boolean; prevDiagram?: any }> =
({ shot, diagrams, chapters, voice, sfx, prevDiagram }) => {
  const spec = shot.diagram ? diagrams[shot.diagram] : null;
  const t = useTransition((shot.transition ?? "push") as Trans);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={t.style as any}>
        <Plate shot={shot} />
        {spec ? (spec.type === "compare"
          ? <CompareBars spec={spec} />
          : <SplitBar spec={spec} carried={prevDiagram?.parts?.length ?? 0} />) : null}
        <Caption text={shot.onScreen} />
        <Chrome chapters={chapters} index={shot.chapter} />
      </AbsoluteFill>
      {/* wipe band: a hard amber edge leading the reveal */}
      {t.band !== null && t.band < 1 ? (
        <AbsoluteFill style={{
          top: `${(1 - t.band) * 100}%`, height: 8, background: AMBER,
          boxShadow: `0 0 40px ${AMBER}`, pointerEvents: "none",
        }} />
      ) : null}
      {t.dip > 0 ? (
        <AbsoluteFill style={{ background: "#04060d", opacity: t.dip, pointerEvents: "none" }} />
      ) : null}
      {voice ? <Audio src={staticFile(`vo/${shot.id}.mp3`)} /> : null}
      {sfx && shot.sfx ? <Audio src={staticFile(`sfx/${shot.sfx}.mp3`)} volume={0.35} /> : null}
    </AbsoluteFill>
  );
};

export const ExplainerFilm: React.FC<FilmProps> = ({ chapters, shots, diagrams, hasVoice, hasSfx }) => (
  <AbsoluteFill style={{ background: INK }}>
    <Series>
      {shots.map((s, i) => (
        <Series.Sequence key={s.id} durationInFrames={s.frames ?? 95}>
          <Shot
            shot={s} diagrams={diagrams} chapters={chapters}
            voice={hasVoice} sfx={hasSfx}
            prevDiagram={s.transition === "matchCut" && i > 0 && shots[i - 1].diagram
              ? diagrams[shots[i - 1].diagram!] : undefined}
          />
        </Series.Sequence>
      ))}
    </Series>
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 50 }}>
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 24, letterSpacing: 6,
        color: "rgba(255,233,196,.45)",
      }}>@WICKSWISDOM</div>
    </AbsoluteFill>
  </AbsoluteFill>
);
