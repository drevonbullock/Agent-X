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

// LIGHT PALETTE. Dre, 2026-09-04: "the background needs to be lighter like
// bright off white." Inverting a dark film is not a colour swap — every scrim,
// shadow and type colour has to flip or the frame turns to mud. On white:
//   - text goes INK, never grey, or it reads washed out on a phone in daylight
//   - drop shadows become soft and tinted, not black; black shadows on white
//     look like clip art
//   - amber has poor contrast as TEXT on white, so it fills shapes and gets a
//     darker sibling (AMBER_INK) whenever it has to be read as a word
const PAPER = "#F7F3EA";        // warm off-white, not clinical #fff
const PAPER_DEEP = "#EDE7DA";   // the shade behind the subject
const INK = "#141C2B";          // near-black navy, the type colour
const INK_SOFT = "#5A6472";     // secondary type
const AMBER = "#F0A31C";        // fills, bars, the accent
const AMBER_INK = "#B26A00";    // amber as readable TEXT on paper
const RED = "#D6335C";
const GREEN = "#1FA463";

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
    // An annotation names the DIAGRAM PART it is about. That link is the whole
    // point: a graphic that cannot say what it is pointing at will float.
    annotate: z.object({
      kind: z.enum(["ring", "point"]),
      part: z.number(),
    }).optional(),
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
    <AbsoluteFill style={{ background: PAPER, overflow: "hidden" }}>
      {/* graded paper: brightest behind the subject, warming at the edges */}
      <AbsoluteFill style={{
        background: `radial-gradient(ellipse 120% 70% at 50% 40%, #FFFDF8 0%, ${PAPER} 46%, ${PAPER_DEEP} 84%)`,
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
            background: "linear-gradient(160deg, #FFFFFF, #F1EBDF)",
            boxShadow: "inset 0 0 0 1px rgba(20,28,43,.07), 0 26px 60px rgba(20,28,43,.10)",
            display: "flex", flexDirection: "column",
            justifyContent: "center", alignItems: "center", padding: 44, gap: 16,
          }}>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 26,
              letterSpacing: 4, color: AMBER_INK,
            }}>{shot.motion === "video" ? "ANIMATED SHOT" : "ILLUSTRATION"}</div>
            <div style={{
              fontFamily: "'DM Sans', sans-serif", fontSize: 30, lineHeight: 1.35,
              color: INK_SOFT, textAlign: "center",
            }}>{(shot.art ?? "").slice(0, 150)}</div>
          </div>
        </AbsoluteFill>
      )}
      {/* light pool + vignette keep the type readable over any art */}
      {/* the floor the type sits on — paper, not shadow */}
      <AbsoluteFill style={{
        background: `linear-gradient(180deg, rgba(247,243,234,.55) 0%, rgba(247,243,234,0) 26%, rgba(247,243,234,.30) 52%, rgba(247,243,234,.94) 100%)`,
      }} />
    </AbsoluteFill>
  );
};

// ─── DIAGRAMS ────────────────────────────────────────────────────────────────
// The bar builds part by part across consecutive shots, so the viewer watches
// the same paycheck being carved up rather than seeing four unrelated charts.
// LAYOUT CONSTANTS. The annotations below need to know EXACTLY where a segment
// and a label row sit. Left to flex, a graphic lands NEAR the thing it means
// rather than ON it, which is worse than having no graphic at all.
const PAD = 76;
const BARW = 1080 - PAD * 2;
const BARH = 88;
const ROWH = 74;
const GUTTER = 104;   // empty band above the bar. Annotations live here, so
                      // they are structurally incapable of covering the chart.

// Deterministic width estimate for a right-aligned amount, so a ring can be cut
// to the figure it encircles instead of being a fixed blob.
const figureW = (s: string) => s.length * 27 + 22;

// ─── ANNOTATION: RING ────────────────────────────────────────────────────────
// Drawn around ONE label row's amount, anchored to that row's real y. It draws
// itself on like a pen stroke and then holds.
const Ring: React.FC<{ part: number; text: string; delay: number }> = ({ part, text, delay }) => {
  const frame = useCurrentFrame();
  const w = figureW(text);
  const draw = interpolate(frame, [delay, delay + 26], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const LEN = 2 * Math.PI * ((w / 2 + 26 + 42) / 2);
  return (
    <div style={{
      position: "absolute", top: part * ROWH, right: -34,
      width: w + 68, height: ROWH, pointerEvents: "none",
    }}>
      <svg width={w + 68} height={ROWH} style={{ overflow: "visible" }}>
        <ellipse
          cx={(w + 68) / 2} cy={ROWH / 2} rx={w / 2 + 26} ry={40}
          fill="none" stroke={AMBER_INK} strokeWidth={7} strokeLinecap="round"
          strokeDasharray={LEN} strokeDashoffset={LEN * (1 - draw)}
          transform={`rotate(-4 ${(w + 68) / 2} ${ROWH / 2})`}
        />
      </svg>
    </div>
  );
};

// ─── ANNOTATION: POINT ───────────────────────────────────────────────────────
// A short arrow in the gutter, aimed at the horizontal centre of ONE segment.
// It is short and lives in reserved empty space, so it cannot block the chart.
const Point: React.FC<{ mid: number; delay: number }> = ({ mid, delay }) => {
  const frame = useCurrentFrame();
  const draw = interpolate(frame, [delay, delay + 16], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const head = interpolate(frame, [delay + 13, delay + 23], [0, 1], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const y0 = 16, y1 = GUTTER - 26;
  return (
    <div style={{
      position: "absolute", left: mid - 60, bottom: "100%",
      width: 120, height: GUTTER, pointerEvents: "none",
    }}>
      <svg width={120} height={GUTTER} style={{ overflow: "visible" }}>
        <line x1={60} y1={y0} x2={60} y2={y0 + (y1 - y0) * draw}
          stroke={AMBER_INK} strokeWidth={8} strokeLinecap="round" />
        <polyline points={`34,${y1 - 30} 60,${y1} 86,${y1 - 30}`} fill="none"
          stroke={AMBER_INK} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round"
          opacity={head} />
      </svg>
    </div>
  );
};

// ─── DIAGRAM: SPLIT BAR ──────────────────────────────────────────────────────
const SplitBar: React.FC<{ spec: any; carried?: number; annotate?: any }> =
({ spec, carried = 0, annotate }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const parts = spec.parts ?? [];
  const total = spec.total ?? 1;

  // Every segment's exact position, so an annotation can aim AT one.
  let acc = 0;
  const geo = parts.map((p: any) => {
    const x = (acc / total) * BARW;
    const w = (p.amount / total) * BARW;
    acc += p.amount;
    return { x, w, mid: x + w / 2 };
  });

  // An annotation waits for its own row to finish arriving. Drawing over a
  // number that is still animating is the tell that it was bolted on.
  const rowIn = (i: number) => 10 + Math.max(0, i - carried) * 8;
  const aDelay = annotate ? rowIn(annotate.part) + 14 : 0;

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
      <div style={{ width: BARW }}>
        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 130, color: INK,
          textAlign: "center", marginBottom: 10,
        }}>{money(total)}</div>

        {/* the bar, with the annotation gutter reserved directly above it */}
        <div style={{ position: "relative", marginTop: GUTTER }}>
          <div style={{
            display: "flex", height: BARH, borderRadius: 8, overflow: "hidden",
            background: "#E4DCCC", boxShadow: "0 14px 34px rgba(20,28,43,.13)",
          }}>
            {parts.map((p: any, i: number) => {
              // MATCH CUT: segments the previous shot already showed are drawn
              // at full width immediately, so the bar appears continuous across
              // the cut and only the NEW slice animates in.
              const w = i < carried ? 1 : spring({ frame: frame - 4 - (i - carried) * 8, fps, config: { damping: 200 } });
              return (
                <div key={i} style={{
                  width: `${(p.amount / total) * 100 * w}%`,
                  background: p.accent
                    ? `linear-gradient(180deg, ${AMBER}, #D18B0C)`
                    : `rgba(20,28,43,${0.62 - i * 0.13})`,
                  borderRight: `3px solid ${PAPER}`,
                }} />
              );
            })}
          </div>
          {annotate?.kind === "point" && geo[annotate.part] ? (
            <Point mid={geo[annotate.part].mid} delay={aDelay} />
          ) : null}
        </div>

        {/* label rows, at a fixed height so a ring can find one by index */}
        <div style={{ position: "relative", marginTop: 40 }}>
          {parts.map((p: any, i: number) => {
            const o = i < carried ? 1 : spring({ frame: frame - rowIn(i), fps, config: { damping: 200 } });
            return (
              <div key={i} style={{
                height: ROWH, display: "flex", alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "'DM Sans', sans-serif", fontSize: 48,
                color: p.accent ? AMBER_INK : INK, opacity: o,
                transform: `translateX(${(1 - o) * -22}px)`,
              }}>
                <span>{p.label}</span>
                <span style={{ fontWeight: 800 }}>{money(p.amount)}</span>
              </div>
            );
          })}
          {annotate?.kind === "ring" && parts[annotate.part] ? (
            <Ring part={annotate.part} text={money(parts[annotate.part].amount)} delay={aDelay} />
          ) : null}
        </div>
      </div>
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
              fontFamily: "'DM Sans', sans-serif", fontSize: 44, color: INK, marginBottom: 12,
            }}>
              <span>{r.label}</span>
              <span style={{ color: r.color, fontWeight: 800 }}>{money(r.amount)}/mo</span>
            </div>
            <div style={{ height: 62, background: "#E4DCCC", borderRadius: 6, overflow: "hidden" }}>
              <div style={{
                width: `${(r.year / max) * 100 * g}%`, height: "100%",
                background: `linear-gradient(90deg, ${r.color}, ${r.color}bb)`,
                boxShadow: `0 6px 18px ${r.color}33`,
              }} />
            </div>
            <div style={{
              fontFamily: "Anton, Impact, sans-serif", fontSize: 76, color: r.color, marginTop: 10,
            }}>{money(r.year * g)}</div>
          </div>
        );
      })}
      <div style={{
        fontFamily: "'DM Sans', sans-serif", fontSize: 38, color: INK_SOFT,
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
        color: INK, textAlign: "center", textTransform: "uppercase",
        opacity: Math.min(1, inS) * out,
        transform: `translateY(${(1 - Math.min(1, inS)) * 34}px)`,
        padding: "0 70px",
      }}>
        {parts.map((p, i) => (
          <span key={i} style={{ color: /^\$/.test(p) ? AMBER_INK : INK }}>{p}</span>
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
        boxShadow: "0 1px 6px rgba(240,163,28,.5)",
      }} />
      <div style={{
        position: "absolute", top: 38, left: 44, display: "flex", alignItems: "center", gap: 13,
      }}>
        <div style={{ width: 9, height: 9, background: AMBER, borderRadius: 2 }} />
        <span style={{
          fontFamily: "'DM Sans', sans-serif", fontWeight: 800, fontSize: 24,
          letterSpacing: 3, textTransform: "uppercase", color: INK_SOFT,
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
          : <SplitBar spec={spec} carried={prevDiagram?.parts?.length ?? 0} annotate={shot.annotate} />) : null}
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
        <AbsoluteFill style={{ background: PAPER_DEEP, opacity: t.dip, pointerEvents: "none" }} />
      ) : null}
      {voice ? <Audio src={staticFile(`vo/${shot.id}.mp3`)} /> : null}
      {sfx && shot.sfx ? <Audio src={staticFile(`sfx/${shot.sfx}.mp3`)} volume={0.35} /> : null}
    </AbsoluteFill>
  );
};

export const ExplainerFilm: React.FC<FilmProps> = ({ chapters, shots, diagrams, hasVoice, hasSfx }) => (
  <AbsoluteFill style={{ background: PAPER }}>
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
        color: "rgba(20,28,43,.38)",
      }}>@WICKSWISDOM</div>
    </AbsoluteFill>
  </AbsoluteFill>
);
