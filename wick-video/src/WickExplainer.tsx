import React from "react";
import {
  AbsoluteFill, Audio, Img, Series,
  interpolate, spring, useCurrentFrame, useVideoConfig, staticFile,
} from "remotion";
import { z } from "zod";

// ─── WICK EXPLAINERS ─────────────────────────────────────────────────────────
// Dre, 2026-08-29: "add explainer videos with animations."
//
// The carousels TELL the mechanic. An explainer SHOWS it, and showing is the
// thing the page has never been able to do: you cannot draw compounding on a
// still, and an AI video model cannot render the numbers that make it land.
// Remotion can do both at once, deterministically and for free.
//
// Four scene types, chosen because they cover the money mechanics this brand
// actually teaches:
//   MULTIPLY  a small daily number becoming a yearly one   (the core Wick move)
//   SPLIT     where a paycheck actually goes               (allocation)
//   RACE      two choices diverging over time              (compounding)
//   LEAK      a balance draining through unnoticed holes   (fees, creep)
//
// Every scene animates its ARITHMETIC. Nothing decorative moves.

const NAVY = "#0d1830";
const NAVY_DEEP = "#070d1c";
const AMBER = "#F5A524";
const CREAM = "#ffe9c4";
const RED = "#ff5470";
const GREEN = "#3ddc84";

const money = (n: number) =>
  "$" + Math.round(n).toLocaleString("en-US");

export const explainerSchema = z.object({
  title: z.string(),
  subtitle: z.string(),
  scenes: z.array(z.discriminatedUnion("type", [
    z.object({
      type: z.literal("multiply"),
      caption: z.string(),
      unit: z.number(),          // 5   ("five dollars")
      times: z.number(),         // 365 ("a day, for a year")
      unitLabel: z.string(),     // "a day"
      totalLabel: z.string(),    // "a year"
    }),
    z.object({
      type: z.literal("split"),
      caption: z.string(),
      total: z.number(),
      parts: z.array(z.object({ label: z.string(), amount: z.number(), accent: z.boolean().optional() })),
    }),
    z.object({
      type: z.literal("race"),
      caption: z.string(),
      years: z.number(),
      a: z.object({ label: z.string(), start: z.number(), rate: z.number() }),
      b: z.object({ label: z.string(), start: z.number(), rate: z.number() }),
    }),
    z.object({
      type: z.literal("leak"),
      caption: z.string(),
      start: z.number(),
      leaks: z.array(z.object({ label: z.string(), amount: z.number() })),
    }),
  ])),
  closing: z.string(),
  wickImage: z.string(),
  // Written by scripts/wick-voiceover.js after it measures each clip, so scene
  // lengths follow the narrator instead of a guessed constant.
  hasVoice: z.boolean().optional(),
  timing: z.object({
    title: z.number(),
    scenes: z.array(z.number()),
    close: z.number(),
  }).optional(),
  chapters: z.array(z.string()).optional(),
  narration: z.object({
    title: z.string().optional(),
    scenes: z.array(z.string()).optional(),
    close: z.string().optional(),
  }).optional(),
});
export type ExplainerProps = z.infer<typeof explainerSchema>;

const resolve = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));

// ─── LIVING BACKGROUND ───────────────────────────────────────────────────────
// Flat navy read as a slide deck. This is a slow gradient-orb drift over a
// faint grid: it never competes with the numbers (no hard edges, nothing
// crossing the type) but the frame is never static either. Deterministic —
// every value is a function of the frame, so renders are reproducible.
const LivingBg: React.FC<{ seed?: number }> = ({ seed = 0 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  // EDITORIAL, NOT AMBIENT. The orb-drift version read as a screensaver behind
  // the numbers. An explainer channel's frame is a STUDIO: a graded backdrop
  // with a horizon, a floor the diagrams sit on, and a slow parallax so the
  // camera feels alive without anything wandering across the type.
  const drift = Math.sin(t * 0.12 + seed) * 14;
  return (
    <AbsoluteFill style={{ background: "#070c18", overflow: "hidden" }}>
      {/* graded backdrop, brighter behind the subject */}
      <AbsoluteFill style={{
        background:
          "radial-gradient(ellipse 120% 62% at 50% 30%, #14203c 0%, #0c1428 42%, #060a14 78%)",
        transform: `translateY(${drift * 0.4}px)`,
      }} />
      {/* horizon: the studio floor line */}
      <AbsoluteFill style={{
        top: "80%",
        background: "linear-gradient(180deg, rgba(120,170,255,.10), transparent 34%)",
        borderTop: "1px solid rgba(140,190,255,.13)",
        transform: `translateY(${drift * 0.7}px)`,
      }} />
      {/* perspective floor grid, receding */}
      <AbsoluteFill style={{
        top: "80%",
        backgroundImage:
          "linear-gradient(90deg, rgba(140,190,255,.10) 1px, transparent 1px)," +
          "linear-gradient(rgba(140,190,255,.08) 1px, transparent 1px)",
        backgroundSize: "120px 46px",
        backgroundPosition: `${(t * 9) % 120}px 0`,
        maskImage: "linear-gradient(180deg, #000 0%, transparent 62%)",
        WebkitMaskImage: "linear-gradient(180deg, #000 0%, transparent 62%)",
        transform: `translateY(${drift * 0.7}px)`,
      }} />
      {/* key light from above, so the subject sits in a pool rather than on a flat field */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 58% 34% at 50% 44%, rgba(255,214,150,.075), transparent 70%)",
      }} />
      {/* vignette */}
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 96% 66% at 50% 46%, transparent 42%, rgba(2,4,10,.82))",
      }} />
    </AbsoluteFill>
  );
};

// ─── EXPLAINER CHROME ────────────────────────────────────────────────────────
// What actually makes a video read as an explainer channel rather than a social
// post: the viewer always knows where they are. A chapter rail names the
// current section, a progress bar shows how far in they are, and a step
// counter promises an end. All three reduce the urge to swipe.
const Chrome: React.FC<{ chapters: string[]; index: number }> = ({ chapters, index }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const p = frame / durationInFrames;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/* progress */}
      <div style={{
        position: "absolute", top: 0, left: 0, height: 6, width: `${p * 100}%`,
        background: `linear-gradient(90deg, ${AMBER}, #ffd479)`,
        boxShadow: `0 0 18px rgba(245,165,36,.55)`,
      }} />
      {/* chapter rail */}
      <div style={{
        position: "absolute", top: 42, left: 44, display: "flex", alignItems: "center", gap: 14,
      }}>
        <div style={{ width: 10, height: 10, background: AMBER, borderRadius: 2 }} />
        <span style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 26,
          letterSpacing: 3, textTransform: "uppercase", color: "rgba(255,233,196,.82)",
        }}>{chapters[index] ?? ""}</span>
      </div>
      {/* step counter */}
      <div style={{
        position: "absolute", top: 42, right: 44,
        fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 26,
        letterSpacing: 2, color: "rgba(255,233,196,.45)",
      }}>{index > 0 && index <= chapters.length - 2 ? `${index} / ${chapters.length - 2}` : ""}</div>
    </AbsoluteFill>
  );
};

// Shared frame: living background, caption, the diagram, and Wick present.
const Stage: React.FC<{ caption: string; children: React.ReactNode; seed?: number; chapter?: string }> =
({ caption, children, seed = 0, chapter }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Overshoot easing: the caption arrives with weight instead of fading.
  const capIn = spring({ frame, fps, config: { damping: 15, mass: 0.7, stiffness: 90 } });
  return (
    <AbsoluteFill>
      <LivingBg seed={seed} />
      <AbsoluteFill style={{ padding: "176px 84px 0", alignItems: "center" }}>
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 54,
          color: "#fff", textAlign: "center", lineHeight: 1.2,
          opacity: Math.min(1, capIn), transform: `translateY(${(1 - capIn) * 30}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,.7)",
        }}>{caption}</div>
      </AbsoluteFill>
      {children}
    </AbsoluteFill>
  );
};

// ─── MULTIPLY ────────────────────────────────────────────────────────────────
// A single small amount, then the multiplier lands, then the total. This is the
// exact shape of the page's one proven winner ("pick 10k, save twelve a day"),
// so it is the default scene.
const Multiply: React.FC<Extract<ExplainerProps["scenes"][number], { type: "multiply" }>> =
({ caption, unit, times, unitLabel, totalLabel }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const unitIn = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const xIn = spring({ frame: frame - 34, fps, config: { damping: 14, mass: 0.5 } });
  const totalP = spring({ frame: frame - 56, fps, config: { damping: 200, mass: 0.8 } });

  // Dots: one per unit, filling in — the pile IS the argument.
  const dots = Math.min(times, 120);
  const filled = Math.floor(interpolate(frame, [56, 104], [0, dots], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));

  return (
    <Stage caption={caption} seed={1}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 90 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 26, opacity: unitIn }}>
          <span style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 150, color: "#fff" }}>
            {money(unit)}
          </span>
          <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 46, color: CREAM }}>
            {unitLabel}
          </span>
        </div>

        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 76, color: AMBER, margin: "18px 0",
          opacity: xIn, transform: `scale(${0.6 + xIn * 0.4})`,
        }}>× {times.toLocaleString("en-US")}</div>

        {/* the pile */}
        <div style={{
          display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 7,
          width: 720, margin: "10px 0 28px",
        }}>
          {Array.from({ length: dots }).map((_, i) => (
            <div key={i} style={{
              width: 13, height: 13, borderRadius: 2,
              background: i < filled ? AMBER : "rgba(245,165,36,.13)",
              transform: i < filled ? "scale(1)" : "scale(.7)",
            }} />
          ))}
        </div>

        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 190, color: AMBER,
          opacity: totalP, transform: `translateY(${(1 - totalP) * 26}px)`,
          textShadow: "0 10px 46px rgba(245,165,36,.32)",
        }}>{money(totalP * unit * times)}</div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 48, color: CREAM, opacity: totalP,
        }}>{totalLabel}</div>
      </AbsoluteFill>
    </Stage>
  );
};

// ─── SPLIT ───────────────────────────────────────────────────────────────────
// One bar breaking into its parts. Shows allocation without a pie chart, which
// reads badly on a phone.
const Split: React.FC<Extract<ExplainerProps["scenes"][number], { type: "split" }>> =
({ caption, total, parts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const barIn = spring({ frame: frame - 10, fps, config: { damping: 200 } });
  const sum = parts.reduce((a, p) => a + p.amount, 0) || 1;

  return (
    <Stage caption={caption} seed={2}>
      <AbsoluteFill style={{ justifyContent: "center", padding: "120px 84px 0" }}>
        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 128, color: "#fff",
          textAlign: "center", opacity: barIn, marginBottom: 34,
        }}>{money(total)}</div>

        {/* the bar */}
        <div style={{ display: "flex", height: 74, borderRadius: 6, overflow: "hidden", marginBottom: 40 }}>
          {parts.map((p, i) => {
            const w = spring({ frame: frame - 24 - i * 8, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{
                width: `${(p.amount / sum) * 100 * w}%`,
                background: p.accent ? AMBER : `rgba(255,233,196,${0.30 - i * 0.05})`,
                borderRight: "3px solid " + NAVY_DEEP,
              }} />
            );
          })}
        </div>

        {parts.map((p, i) => {
          const o = spring({ frame: frame - 40 - i * 10, fps, config: { damping: 200 } });
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              fontFamily: "'DM Sans', sans-serif", fontSize: 46, marginBottom: 16,
              color: p.accent ? AMBER : CREAM, opacity: o,
              transform: `translateX(${(1 - o) * -20}px)`,
            }}>
              <span>{p.label}</span>
              <span style={{ fontWeight: 800 }}>{money(p.amount)}</span>
            </div>
          );
        })}
      </AbsoluteFill>
    </Stage>
  );
};

// ─── RACE ────────────────────────────────────────────────────────────────────
// Two paths drawn year by year. Compounding is invisible in a sentence and
// obvious in a line, which is the whole reason this scene exists.
const Race: React.FC<Extract<ExplainerProps["scenes"][number], { type: "race" }>> =
({ caption, years, a, b }) => {
  const frame = useCurrentFrame();
  const W = 860, H = 520;
  const grow = (s: number, r: number, y: number) => s * Math.pow(1 + r, y);
  const peak = Math.max(grow(a.start, a.rate, years), grow(b.start, b.rate, years));
  const progress = interpolate(frame, [16, 96], [0, years], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  const path = (s: number, r: number) => {
    const pts: string[] = [];
    for (let y = 0; y <= progress; y += 0.25) {
      const x = (y / years) * W;
      const val = grow(s, r, y);
      pts.push(`${x},${H - (val / peak) * H}`);
    }
    return pts.join(" ");
  };

  const label = (s: number, r: number) => grow(s, r, progress);

  return (
    <Stage caption={caption} seed={3}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 110 }}>
        <svg width={W} height={H} style={{ overflow: "visible" }}>
          {[0, 0.25, 0.5, 0.75, 1].map((g) => (
            <line key={g} x1={0} y1={H * g} x2={W} y2={H * g}
              stroke="rgba(255,233,196,.10)" strokeWidth={2} />
          ))}
          <polyline points={path(b.start, b.rate)} fill="none" stroke={RED} strokeWidth={8}
            strokeLinecap="round" strokeLinejoin="round" />
          <polyline points={path(a.start, a.rate)} fill="none" stroke={GREEN} strokeWidth={9}
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <div style={{ display: "flex", gap: 60, marginTop: 42 }}>
          {[{ ...a, c: GREEN }, { ...b, c: RED }].map((s, i) => (
            <div key={i} style={{ textAlign: "center" }}>
              <div style={{ fontFamily: "Anton, Impact, sans-serif", fontSize: 84, color: s.c }}>
                {money(label(s.start, s.rate))}
              </div>
              <div style={{ fontFamily: "'DM Sans', sans-serif", fontSize: 38, color: CREAM }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 40, color: "rgba(255,233,196,.6)", marginTop: 22,
        }}>after {Math.round(progress)} years</div>
      </AbsoluteFill>
    </Stage>
  );
};

// ─── LEAK ────────────────────────────────────────────────────────────────────
// A balance draining as each unnoticed cost is named. Loss is felt, not read.
const Leak: React.FC<Extract<ExplainerProps["scenes"][number], { type: "leak" }>> =
({ caption, start, leaks }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const per = 26;
  let drained = 0;
  leaks.forEach((l, i) => {
    const p = spring({ frame: frame - 26 - i * per, fps, config: { damping: 200 } });
    drained += l.amount * p;
  });
  const remaining = Math.max(0, start - drained);
  const pct = remaining / start;

  return (
    <Stage caption={caption} seed={4}>
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", paddingTop: 100 }}>
        {/* the tank */}
        <div style={{
          width: 420, height: 420, border: `7px solid rgba(255,233,196,.28)`, borderRadius: 14,
          position: "relative", overflow: "hidden", background: "rgba(255,255,255,.02)",
        }}>
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0,
            height: `${pct * 100}%`,
            background: `linear-gradient(180deg, ${AMBER}, #b9761a)`,
            transition: "none",
          }} />
        </div>
        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 118, color: "#fff",
          marginTop: 22, textShadow: "0 6px 26px rgba(0,0,0,.8)",
        }}>{money(remaining)}</div>

        <div style={{ marginTop: 40, width: 760 }}>
          {leaks.map((l, i) => {
            const o = spring({ frame: frame - 26 - i * per, fps, config: { damping: 200 } });
            return (
              <div key={i} style={{
                display: "flex", justifyContent: "space-between",
                fontFamily: "'DM Sans', sans-serif", fontSize: 44, marginBottom: 14,
                color: CREAM, opacity: o, transform: `translateX(${(1 - o) * 24}px)`,
              }}>
                <span>{l.label}</span>
                <span style={{ color: RED, fontWeight: 800 }}>−{money(l.amount)}</span>
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
    </Stage>
  );
};

// ─── TITLE + CLOSE ───────────────────────────────────────────────────────────
const Title: React.FC<{ title: string; subtitle: string; wickImage: string }> =
({ title, subtitle, wickImage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 200 } });
  const scale = interpolate(frame, [0, 75], [1.08, 1.16], { extrapolateRight: "clamp" });
  const parts = title.toUpperCase().split(/(\$[\d,]+)/g);
  return (
    <AbsoluteFill style={{ background: NAVY_DEEP }}>
      <LivingBg seed={0} />
      {wickImage ? (
        <AbsoluteFill style={{ overflow: "hidden", opacity: 0.28 }}>
          <Img src={resolve(wickImage)} style={{
            width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale})`,
          }} />
          <AbsoluteFill style={{
            background: "linear-gradient(180deg, rgba(7,13,28,.72), rgba(7,13,28,.96))",
          }} />
        </AbsoluteFill>
      ) : null}
      <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 84px" }}>
        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 128, lineHeight: 1.02,
          textAlign: "center", textTransform: "uppercase", color: "#fff",
          opacity: inS, transform: `translateY(${(1 - inS) * 34}px)`,
          textShadow: "0 8px 40px rgba(0,0,0,.9)",
        }}>
          {parts.map((p, i) => (
            <span key={i} style={{ color: /^\$/.test(p) ? AMBER : "#fff" }}>{p}</span>
          ))}
        </div>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 46, color: CREAM, marginTop: 26,
          textAlign: "center", opacity: inS,
        }}>{subtitle}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const Close: React.FC<{ closing: string }> = ({ closing }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inS = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", padding: "0 90px" }}>
      <LivingBg seed={5} />
      <div style={{
        fontFamily: "Anton, Impact, sans-serif", fontSize: 92, color: "#fff", textAlign: "center",
        textTransform: "uppercase", lineHeight: 1.1, opacity: inS,
        transform: `scale(${0.94 + inS * 0.06})`,
      }}>{closing}</div>
      <div style={{
        width: 130, height: 5, background: AMBER, marginTop: 40,
        transform: `scaleX(${inS})`,
      }} />
    </AbsoluteFill>
  );
};

// ─── THE EXPLAINER ───────────────────────────────────────────────────────────
export const SCENE_FRAMES = 132;

// Voice clip for a section. Silent when no narration was generated, so the
// composition renders identically with or without audio.
const Vo: React.FC<{ id: string; on?: boolean }> = ({ id, on }) =>
  on ? <Audio src={staticFile(`vo/${id}.mp3`)} /> : null;

export const WickExplainer: React.FC<ExplainerProps> = ({
  title, subtitle, scenes, closing, wickImage, hasVoice, timing, chapters,
}) => {
  const chaps = chapters ?? ["INTRO", ...scenes.map((_, i) => `PART ${i + 1}`), "TAKEAWAY"];
  const tTitle = timing?.title ?? 78;
  const tScenes = timing?.scenes ?? scenes.map(() => SCENE_FRAMES);
  const tClose = timing?.close ?? 96;

  return (
    <AbsoluteFill style={{ background: "#070c18" }}>
      <Series>
        <Series.Sequence durationInFrames={tTitle}>
          <Vo id="title" on={hasVoice} />
          <Title title={title} subtitle={subtitle} wickImage={wickImage} />
          <Chrome chapters={chaps} index={0} />
        </Series.Sequence>
        {scenes.map((sc, i) => (
          <Series.Sequence key={i} durationInFrames={tScenes[i] ?? SCENE_FRAMES}>
            <Vo id={`s${i}`} on={hasVoice} />
            {sc.type === "multiply" ? <Multiply {...sc} />
              : sc.type === "split" ? <Split {...sc} />
              : sc.type === "race" ? <Race {...sc} />
              : <Leak {...sc} />}
            <Chrome chapters={chaps} index={i + 1} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={tClose}>
          <Vo id="close" on={hasVoice} />
          <Close closing={closing} />
          <Chrome chapters={chaps} index={chaps.length - 1} />
        </Series.Sequence>
      </Series>
      <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54 }}>
        <div style={{
          fontFamily: "'DM Sans', sans-serif", fontSize: 26, letterSpacing: 6,
          color: "rgba(255,233,196,.5)",
        }}>@WICKSWISDOM</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
