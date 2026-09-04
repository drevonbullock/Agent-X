import React from "react";
import {
  AbsoluteFill, Img, Series,
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
  const orb = (i: number, size: number, hue: string) => {
    const a = t * (0.16 + i * 0.05) + seed + i * 2.1;
    return {
      position: "absolute" as const,
      width: size, height: size, borderRadius: "50%",
      left: `${50 + Math.sin(a) * (16 + i * 7)}%`,
      top: `${42 + Math.cos(a * 0.8) * (14 + i * 6)}%`,
      transform: "translate(-50%,-50%)",
      background: `radial-gradient(circle, ${hue}, transparent 68%)`,
      filter: "blur(58px)",
    };
  };
  return (
    <AbsoluteFill style={{ background: NAVY_DEEP, overflow: "hidden" }}>
      <div style={orb(0, 820, "rgba(245,165,36,.13)")} />
      <div style={orb(1, 700, "rgba(76,148,240,.11)")} />
      <div style={orb(2, 560, "rgba(61,220,132,.07)")} />
      {/* faint grid, drifting up so the frame breathes */}
      <AbsoluteFill style={{
        backgroundImage:
          "linear-gradient(rgba(255,233,196,.045) 1px, transparent 1px)," +
          "linear-gradient(90deg, rgba(255,233,196,.045) 1px, transparent 1px)",
        backgroundSize: "88px 88px",
        backgroundPosition: `0px ${-(t * 7) % 88}px`,
        maskImage: "radial-gradient(ellipse 78% 62% at 50% 45%, #000 35%, transparent 78%)",
      }} />
      <AbsoluteFill style={{
        background: "radial-gradient(ellipse 92% 58% at 50% 40%, transparent 40%, rgba(3,6,14,.72))",
      }} />
    </AbsoluteFill>
  );
};

// ─── WICK, ANIMATED ──────────────────────────────────────────────────────────
// He cannot be generated in motion without drifting off-model, so he is a
// verified still that MOVES: a breathing bob, a flame flicker driven by summed
// sines (organic, never a loop you can count), and a lean toward whatever the
// scene is showing. Screen blend keys the pure-black plate out against the dark
// background, so no alpha channel is needed.
const WickSprite: React.FC<{ side?: "left" | "right"; scale?: number }> =
({ side = "right", scale = 1 }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const t = frame / fps;

  // SQUASH AND STRETCH, not translation. The first version floated the whole
  // sprite up and down and rotated it, which reads as a wobbling sticker — a
  // real character breathes by compressing and extending against the ground.
  // Anchored at the feet so he stays planted; volume is conserved (x widens as
  // y compresses) which is what sells it as mass rather than a scaling image.
  const breath = Math.sin(t * 1.25);              // slow, ~1.25 rad/s
  const sy = 1 + breath * 0.018;
  const sx = 1 - breath * 0.014;

  // Weight shift: a few pixels laterally, no rotation. Rotating the body was
  // the single worst tell in v1.
  const shift = Math.sin(t * 0.62) * 5;

  // Flame flicker, SLOW. v1 summed 9Hz and 14Hz sines, which strobes on a
  // 30fps render. Real candle flicker is irregular but gentle: two slow
  // incommensurate frequencies read as organic without flashing.
  const flick = 1 + Math.sin(t * 2.3) * 0.05 + Math.sin(t * 3.7) * 0.03;

  // Entrance: anticipation (dip) then overshoot then settle.
  const e = spring({ frame: frame - 4, fps, config: { damping: 12, mass: 0.8, stiffness: 110 } });
  const rise = interpolate(e, [0, 1], [86, 0]);
  const exit = interpolate(frame, [durationInFrames - 14, durationInFrames - 2], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const dir = side === "right" ? 1 : -1;

  return (
    <div style={{
      position: "absolute", bottom: 92, [side]: 34, zIndex: 3,
      opacity: e * exit,
      transform: `translateX(${shift * dir}px) translateY(${rise}px)`,
    }}>
      {/* contact shadow: widens as he compresses, which is what ties him to
          the floor instead of leaving him hovering */}
      <div style={{
        position: "absolute", bottom: -6, left: "50%",
        width: 210 * sx, height: 16,
        transform: "translateX(-50%)", borderRadius: "50%",
        background: `radial-gradient(ellipse, rgba(0,0,0,${0.42 + breath * 0.05}), transparent 70%)`,
        filter: "blur(6px)",
      }} />
      {/* glow breathes with the flame */}
      <div style={{
        position: "absolute", left: "50%", top: "4%", transform: "translateX(-50%)",
        width: 330, height: 330, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(245,165,36,${0.26 * flick}), transparent 64%)`,
        filter: "blur(34px)",
      }} />
      {/* Real alpha (ffmpeg colorkey), so no blend-mode hackery: screen blend,
          the contrast crush and the radial mask all existed only to fake
          transparency, and all three left a visible rectangle. */}
      <Img src={staticFile("wick.png")} style={{
        width: 340, display: "block",
        transformOrigin: "bottom center",
        transform: `scale(${scale}) scaleX(${sx * dir}) scaleY(${sy})`,
        filter: `brightness(${0.98 + (flick - 1) * 0.9}) drop-shadow(0 0 26px rgba(245,165,36,${0.34 * flick}))`,
      }} />
    </div>
  );
};

// Shared frame: living background, caption, the diagram, and Wick present.
const Stage: React.FC<{ caption: string; children: React.ReactNode; seed?: number; wick?: boolean; wickSide?: "left" | "right" }> =
({ caption, children, seed = 0, wick = true, wickSide = "right" }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // Overshoot easing: the caption arrives with weight instead of fading.
  const capIn = spring({ frame, fps, config: { damping: 15, mass: 0.7, stiffness: 90 } });
  return (
    <AbsoluteFill>
      <LivingBg seed={seed} />
      <AbsoluteFill style={{ padding: "144px 84px 0", alignItems: "center" }}>
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 54,
          color: "#fff", textAlign: "center", lineHeight: 1.2,
          opacity: Math.min(1, capIn), transform: `translateY(${(1 - capIn) * 30}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,.7)",
        }}>{caption}</div>
      </AbsoluteFill>
      {children}
      {wick ? <WickSprite side={wickSide} scale={0.82} /> : null}
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
    <Stage caption={caption} seed={1} wick={false}>
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
    <Stage caption={caption} seed={2} wickSide="right">
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
    <Stage caption={caption} seed={3} wick={false}>
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
    <Stage caption={caption} seed={4} wickSide="left">
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
      <WickSprite side="right" scale={1.05} />
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
      <WickSprite side="right" scale={0.9} />
    </AbsoluteFill>
  );
};

// ─── THE EXPLAINER ───────────────────────────────────────────────────────────
export const SCENE_FRAMES = 132;
export const WickExplainer: React.FC<ExplainerProps> = ({ title, subtitle, scenes, closing, wickImage }) => (
  <AbsoluteFill style={{ background: NAVY_DEEP }}>
    <Series>
      <Series.Sequence durationInFrames={78}>
        <Title title={title} subtitle={subtitle} wickImage={wickImage} />
      </Series.Sequence>
      {scenes.map((s, i) => (
        <Series.Sequence key={i} durationInFrames={SCENE_FRAMES}>
          {s.type === "multiply" ? <Multiply {...s} />
            : s.type === "split" ? <Split {...s} />
            : s.type === "race" ? <Race {...s} />
            : <Leak {...s} />}
        </Series.Sequence>
      ))}
      <Series.Sequence durationInFrames={96}>
        <Close closing={closing} />
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
