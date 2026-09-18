import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, Sequence,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { z } from "zod";
// Same props as QuickTipReel, so any reel config can render in either look.
// Importing it also registers the Anton / DM Sans font load.
import { quickTipSchema } from "./QuickTipReel";

// ─── CINEMATIC TIP REEL ──────────────────────────────────────────────────────
// Dre, 2026-09-18: "make the visual better and more appealing."
// The paper version read like a document. This one is cinematic, the way the
// money pages that perform are: every scene's Wick art fills the frame with a
// slow push-in, a zoom-blur on each cut, warm light leaks and film grain; the
// demos (phone, auto-invest card, growth chart, share sheet) are frosted-glass
// panels in a thin bezel floating over the scene; key numbers glow gold;
// captions are big white words with the spoken one lit gold, no box.
// Voice only: no music, no sound effects.

type Props = z.infer<typeof quickTipSchema>;

const BG = "#0B0907";
const WHITE = "#FFF8EC";
const MUTED = "rgba(255,248,236,0.66)";
const GOLD = "#FFC83D";
const EASE = Easing.bezier(0.32, 0.72, 0, 1);
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const TEXT_SHADOW = "0 4px 24px rgba(0,0,0,0.55), 0 1px 3px rgba(0,0,0,0.6)";
const GOLD_GLOW = "0 0 36px rgba(255,200,61,0.45), 0 4px 24px rgba(0,0,0,0.5)";

const src = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));
const bigSize = (text: string, avail: number, max: number) => Math.min(max, Math.floor(avail / (Math.max(3, text.length) * 0.47)));
const ease = (frame: number, from: number, to: number) => interpolate(frame, [from, to], [0, 1], { ...clamp, easing: EASE });

const GRAIN = `url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='240' height='240'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 0.07 0'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>")`;

const Accented: React.FC<{ text: string; accent: string }> = ({ text, accent }) => {
  const i = accent ? text.indexOf(accent) : -1;
  if (i < 0) return <>{text}</>;
  return <>{text.slice(0, i)}<span style={{ color: GOLD, textShadow: GOLD_GLOW }}>{accent}</span>{text.slice(i + accent.length)}</>;
};

// Scene art. The art is 4:5; stretched to fill a 9:16 frame it cropped Wick out
// (half his face off the left edge on the first preview). So the scene shows
// WHOLE at full width with soft edges, over a heavily blurred copy of itself that
// fills the frame. "blur" entry = zoom-blur cut; "punch" = sharp scale-in (the
// hook, which must be readable on frame one).
const Backdrop: React.FC<{ image: string; duration: number; blur?: number; dim?: number; entry?: "blur" | "punch" }> = ({ image, duration, blur = 0, dim = 0.5, entry = "blur" }) => {
  const frame = useCurrentFrame();
  const t = Math.min(1, frame / Math.max(1, duration));
  const e = 1 - ease(frame, 0, 12);
  const extraScale = entry === "punch" ? 0.1 * e : 0.14 * e;
  const extraBlur = entry === "blur" ? 16 * e : 0;
  const mask = "linear-gradient(180deg, transparent 0%, #000 9%, #000 70%, transparent 100%)";
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: BG }}>
      <Img src={src(image)} style={{ position: "absolute", left: -140, top: -140, width: 1360, height: 2200, objectFit: "cover",
        filter: "blur(50px) saturate(1.25) brightness(0.55)", transform: `scale(${1.05 + 0.05 * t})` }} />
      <div style={{ position: "absolute", left: 0, top: 170, width: 1080, height: 1350, transformOrigin: "50% 42%",
        transform: `translate(${-10 * t}px, ${-8 * t}px) scale(${1 + 0.07 * t + extraScale})`, WebkitMaskImage: mask, maskImage: mask }}>
        <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover",
          filter: `blur(${blur + extraBlur}px) saturate(1.12) contrast(1.04)` }} />
      </div>
      <AbsoluteFill style={{ background: `linear-gradient(180deg, rgba(11,9,7,${0.3 + 0.3 * dim}) 0%, rgba(11,9,7,${0.12 * dim}) 20%, rgba(11,9,7,${0.35 * dim}) 50%, rgba(11,9,7,${Math.min(0.92, dim + 0.3)}) 76%, rgba(11,9,7,0.96) 100%)` }} />
    </AbsoluteFill>
  );
};

// Warm light leaks, grain and vignette over everything.
const Atmosphere: React.FC = () => {
  const frame = useCurrentFrame();
  const a = Math.sin(frame / 38), b = Math.cos(frame / 52);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill style={{ mixBlendMode: "screen", opacity: 0.6,
        background: `radial-gradient(42% 26% at ${78 + a * 6}% ${16 + b * 4}%, rgba(255,170,60,0.30), transparent 70%), radial-gradient(36% 24% at ${14 + b * 5}% ${66 + a * 5}%, rgba(255,120,40,0.16), transparent 70%)` }} />
      <AbsoluteFill style={{ backgroundImage: GRAIN, backgroundPosition: `${(frame * 37) % 240}px ${(frame * 53) % 240}px` }} />
      <AbsoluteFill style={{ boxShadow: "inset 0 0 240px rgba(0,0,0,0.55)" }} />
    </AbsoluteFill>
  );
};

// A quick warm flash on each cut.
const Flash: React.FC = () => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [0, 6], [0.3, 0], clamp);
  return o > 0 ? <AbsoluteFill style={{ background: "radial-gradient(60% 50% at 50% 45%, rgba(255,236,200,1), rgba(255,200,61,0.6))", opacity: o, mixBlendMode: "screen" }} /> : null;
};

// Double-bezel glass: a hairline outer shell holding a darker inner core.
const Glass: React.FC<{ style?: React.CSSProperties; inner?: React.CSSProperties; children: React.ReactNode }> = ({ style, inner, children }) => (
  <div style={{ position: "absolute", padding: 10, borderRadius: 56, background: "rgba(255,248,236,0.07)", border: "1.5px solid rgba(255,248,236,0.18)",
    backdropFilter: "blur(26px) saturate(1.25)", boxShadow: "0 40px 90px rgba(0,0,0,0.5)", ...style }}>
    <div style={{ borderRadius: 46, background: "linear-gradient(180deg, rgba(36,28,20,0.74), rgba(16,12,9,0.8))",
      boxShadow: "inset 0 1.5px 0 rgba(255,248,236,0.14)", padding: "30px 38px", ...inner }}>{children}</div>
  </div>
);

const Eyebrow: React.FC<{ children: React.ReactNode; gold?: boolean; style?: React.CSSProperties }> = ({ children, gold, style }) => (
  <span style={{ display: "inline-block", padding: "10px 24px", borderRadius: 999, fontFamily: "DM Sans", fontWeight: 800, fontSize: 26, letterSpacing: 6,
    textTransform: "uppercase", color: gold ? BG : WHITE, background: gold ? GOLD : "rgba(255,248,236,0.12)",
    border: gold ? "1.5px solid transparent" : "1.5px solid rgba(255,248,236,0.22)", backdropFilter: "blur(14px)", ...style }}>{children}</span>
);

const Chrome: React.FC<{ topic: string; scenes: Props["scenes"] }> = ({ topic, scenes }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", top: 262, left: 60, right: 60, display: "flex", gap: 8 }}>
        {scenes.map((s, i) => {
          const p = interpolate(frame, [s.from, Math.max(s.from + 1, s.to)], [0, 1], clamp);
          return (
            <div key={i} style={{ flex: 1, height: 6, borderRadius: 6, background: "rgba(255,248,236,0.22)", overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: WHITE, boxShadow: "0 0 12px rgba(255,248,236,0.8)" }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 292, left: 60, right: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Eyebrow>{topic}</Eyebrow>
        <span style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 26, letterSpacing: 5, color: MUTED, textShadow: TEXT_SHADOW }}>@WICKSWISDOM</span>
      </div>
    </>
  );
};

const StepHeader: React.FC<{ n: string; label: string; image: string }> = ({ n, label, image }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 0, 12), b = ease(frame, 3, 15);
  return (
    <>
      <div style={{ position: "absolute", left: 60, right: 340, top: 384, display: "flex", alignItems: "flex-start", gap: 26 }}>
        <span style={{ fontFamily: "Anton", fontSize: 150, lineHeight: 0.86, color: GOLD, textShadow: GOLD_GLOW,
          opacity: a, transform: `translateY(${(1 - a) * 30}px)` }}>{n}</span>
        <span style={{ fontFamily: "Anton", fontSize: 72, lineHeight: 1, color: WHITE, textTransform: "uppercase", textShadow: TEXT_SHADOW,
          opacity: b, transform: `translateX(${(1 - b) * 40}px)`, marginTop: 8 }}>{label}</span>
      </div>
      <div style={{ position: "absolute", right: 60, top: 370, width: 250, height: 250, padding: 8, borderRadius: 50,
        background: "rgba(255,248,236,0.08)", border: "1.5px solid rgba(255,248,236,0.24)", boxShadow: "0 30px 60px rgba(0,0,0,0.5)",
        transform: `rotate(4deg) scale(${0.7 + 0.3 * b})` }}>
        <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: 42 }} />
      </div>
    </>
  );
};

const Hook: React.FC<{ image: string; hook: Props["hookText"]; shakeAt: number | null; duration: number }> = ({ image, hook, shakeAt, duration }) => {
  const frame = useCurrentFrame();
  const t = ease(frame, 0, 14);
  const shake = shakeAt != null && frame >= shakeAt && frame < shakeAt + 10 ? Math.sin((frame - shakeAt) * 2.6) * 14 : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <Backdrop image={image} duration={duration} dim={0.42} entry="punch" />
      <div style={{ position: "absolute", left: 60, right: 60, top: 1000 }}>
        <Eyebrow style={{ transform: `translateY(${(1 - t) * 18}px)` }}>{hook.kicker}</Eyebrow>
        <div style={{ marginTop: 22, fontFamily: "Anton", fontSize: bigSize(hook.big, 900, 200), lineHeight: 0.95, color: WHITE, textShadow: TEXT_SHADOW,
          transform: `scale(${1.06 - 0.06 * t})`, transformOrigin: "left top" }}>
          <Accented text={hook.big} accent={hook.accent} />
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Lock: React.FC<{ image: string; lock: Props["lock"]; duration: number }> = ({ image, lock, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = ease(frame, 2, 16);
  const stamp = spring({ frame: frame - 12, fps, config: { damping: 9, mass: 0.6, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <Backdrop image={image} duration={duration} blur={6} dim={0.62} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 420, opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
        <Eyebrow gold>And get this</Eyebrow>
        <div style={{ marginTop: 26, fontFamily: "Anton", fontSize: bigSize(lock.big, 960, 220), lineHeight: 0.92, color: WHITE, textShadow: TEXT_SHADOW }}>
          <Accented text={lock.big} accent={lock.accent} />
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 760, display: "flex", gap: 20 }}>
        {["01", "02", "03"].map((n, i) => {
          const s = ease(frame, 6 + i * 4, 20 + i * 4);
          return (
            <div key={n} style={{ flex: 1, height: 190, borderRadius: 42, padding: 8, background: "rgba(255,248,236,0.07)",
              border: "1.5px solid rgba(255,248,236,0.18)", backdropFilter: "blur(20px)", opacity: s, transform: `translateY(${(1 - s) * 60}px)` }}>
              <div style={{ height: "100%", borderRadius: 34, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                background: i === 0 ? GOLD : "rgba(20,16,12,0.62)", color: i === 0 ? BG : WHITE, boxShadow: i === 0 ? "0 0 40px rgba(255,200,61,0.35)" : "none" }}>
                <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 22, letterSpacing: 5, opacity: 0.8 }}>STEP</span>
                <span style={{ fontFamily: "Anton", fontSize: 96, lineHeight: 1 }}>{n}</span>
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 1020, display: "flex", justifyContent: "center" }}>
        <div style={{ padding: "16px 56px", borderRadius: 26, border: `8px solid ${GOLD}`, color: GOLD, fontFamily: "Anton", fontSize: 108, lineHeight: 1,
          textShadow: GOLD_GLOW, boxShadow: "0 0 44px rgba(255,200,61,0.35)",
          transform: `rotate(-6deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`, opacity: Math.min(1, stamp * 1.4) }}>{lock.stamp}</div>
      </div>
    </AbsoluteFill>
  );
};

const Tip1: React.FC<{ image: string; tip: Props["tip1"]; duration: number }> = ({ image, tip, duration }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 2, 20);
  const typed = tip.query.slice(0, Math.max(0, Math.floor((frame - 8) / 3)));
  const doneAt = 8 + tip.query.length * 3;
  const caret = Math.floor(frame / 8) % 2 === 0;
  const tap = interpolate(frame, [doneAt + 12, doneAt + 26], [0, 1], clamp);
  return (
    <AbsoluteFill>
      <Backdrop image={image} duration={duration} blur={10} dim={0.66} />
      <StepHeader n="01" label={tip.label} image={image} />
      <div style={{ position: "absolute", left: 150, right: 150, top: 660, height: 580, perspective: 1600 }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 66, padding: 14, background: "rgba(255,248,236,0.08)",
          border: "1.5px solid rgba(255,248,236,0.22)", backdropFilter: "blur(26px)", boxShadow: "0 50px 100px rgba(0,0,0,0.55)",
          transform: `rotateY(${-16 + 11 * a}deg) rotateX(${7 - 4 * a}deg) translateY(${(1 - a) * 120}px)`, opacity: Math.min(1, a * 1.6) }}>
          <div style={{ width: "100%", height: "100%", borderRadius: 54, background: "linear-gradient(180deg, #19130E, #0E0B08)",
            boxShadow: "inset 0 1.5px 0 rgba(255,248,236,0.12)", padding: "34px 30px", overflow: "hidden" }}>
            <div style={{ height: 88, borderRadius: 44, background: "rgba(255,248,236,0.08)", border: "1.5px solid rgba(255,248,236,0.14)",
              display: "flex", alignItems: "center", gap: 18, padding: "0 28px" }}>
              <div style={{ position: "relative", width: 30, height: 30, borderRadius: "50%", border: `3px solid ${MUTED}` }}>
                <div style={{ position: "absolute", right: -9, bottom: -7, width: 12, height: 3, background: MUTED, transform: "rotate(45deg)" }} />
              </div>
              <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 42, color: WHITE }}>{typed}</span>
              <span style={{ width: 4, height: 44, background: caret ? GOLD : "transparent" }} />
            </div>
            {tip.results.map((r, i) => {
              const s = ease(frame, doneAt + i * 5, doneAt + i * 5 + 12);
              const first = i === 0;
              return (
                <div key={r.ticker} style={{ position: "relative", marginTop: 24, padding: "22px 26px", borderRadius: 30, opacity: s,
                  transform: `translateY(${(1 - s) * 30}px) scale(${first ? 1 - 0.03 * Math.sin(tap * Math.PI) : 1})`,
                  background: first ? "rgba(255,200,61,0.12)" : "rgba(255,248,236,0.05)",
                  border: first ? "1.5px solid rgba(255,200,61,0.55)" : "1.5px solid rgba(255,248,236,0.1)" }}>
                  <div style={{ fontFamily: "Anton", fontSize: 58, lineHeight: 1, color: first ? GOLD : WHITE, textShadow: first ? GOLD_GLOW : "none" }}>{r.ticker}</div>
                  <div style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 26, color: MUTED, marginTop: 6 }}>{r.name}</div>
                  {first && tap > 0 && tap < 1 ? (
                    <div style={{ position: "absolute", right: 40, top: "50%", width: 90, height: 90, marginTop: -45, borderRadius: "50%",
                      border: `4px solid ${GOLD}`, opacity: 1 - tap, transform: `scale(${0.4 + tap})` }} />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Tip2Recurring: React.FC<{ image: string; tip: any; duration: number }> = ({ image, tip, duration }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 2, 18);
  const toggle = ease(frame, 24, 32);
  const on = toggle > 0.5;
  const rows = (tip.rows ?? []) as { k: string; v: string }[];
  return (
    <AbsoluteFill>
      <Backdrop image={image} duration={duration} blur={10} dim={0.66} />
      <StepHeader n="02" label={tip.label} image={image} />
      <Glass style={{ left: 60, right: 60, top: 660, opacity: Math.min(1, a * 1.6), transform: `translateY(${(1 - a) * 120}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 26, letterSpacing: 6, color: MUTED }}>{tip.title}</div>
        {rows.map((r, i) => {
          const s = ease(frame, 8 + i * 4, 20 + i * 4);
          return (
            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "18px 0",
              borderBottom: "1.5px solid rgba(255,248,236,0.1)", opacity: s, transform: `translateX(${(1 - s) * 40}px)` }}>
              <span style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 40, color: MUTED }}>{r.k}</span>
              <span style={{ fontFamily: "Anton", fontSize: 66, color: WHITE }}>{r.v}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 26 }}>
          <span style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 46, color: on ? GOLD : WHITE, textShadow: on ? GOLD_GLOW : "none" }}>{on ? tip.onText : tip.offText}</span>
          <div style={{ position: "relative", width: 156, height: 88, borderRadius: 44, background: on ? GOLD : "rgba(255,248,236,0.16)",
            boxShadow: on ? "0 0 36px rgba(255,200,61,0.55)" : "none" }}>
            <div style={{ position: "absolute", top: 9, left: 9 + 68 * toggle, width: 70, height: 70, borderRadius: "50%", background: "#FFFFFF",
              boxShadow: "0 4px 12px rgba(0,0,0,0.35)" }} />
          </div>
        </div>
      </Glass>
    </AbsoluteFill>
  );
};

const Tip3Growth: React.FC<{ image: string; tip: any; duration: number }> = ({ image, tip, duration }) => {
  const frame = useCurrentFrame();
  const a = ease(frame, 2, 18);
  const bars = (tip.bars ?? []) as { label: string; value: number }[];
  const max = Math.max(1, ...bars.map((b) => b.value));
  const foot = ease(frame, 30, 44);
  const chartH = 320;
  return (
    <AbsoluteFill>
      <Backdrop image={image} duration={duration} blur={10} dim={0.66} />
      <StepHeader n="03" label={tip.label} image={image} />
      <Glass style={{ left: 60, right: 60, top: 650, opacity: Math.min(1, a * 1.6), transform: `translateY(${(1 - a) * 120}px)` }}>
        <div style={{ height: chartH + 130, display: "flex", alignItems: "flex-end", gap: 28 }}>
          {bars.map((b, i) => {
            const g = ease(frame, 3 + i * 7, 27 + i * 7);
            const last = i === bars.length - 1;
            return (
              <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                <span style={{ fontFamily: "Anton", fontSize: last ? 70 : 48, lineHeight: 1, color: last ? GOLD : WHITE, textShadow: last ? GOLD_GLOW : "none", opacity: Math.min(1, g * 1.4) }}>
                  {"$" + Math.round(b.value * g).toLocaleString("en-US")}
                </span>
                <div style={{ width: "100%", height: Math.max(10, (b.value / max) * chartH * g), borderRadius: 24,
                  background: last ? `linear-gradient(180deg, ${GOLD}, #F59E0B)` : "linear-gradient(180deg, rgba(255,248,236,0.85), rgba(255,248,236,0.4))",
                  boxShadow: last ? "0 0 40px rgba(255,200,61,0.45)" : "none" }} />
                <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 26, letterSpacing: 3, color: MUTED }}>{b.label}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 18, opacity: foot, transform: `translateY(${(1 - foot) * 20}px)` }}>
          <div style={{ fontFamily: "Anton", fontSize: 66, lineHeight: 1, color: WHITE }}><Accented text={tip.footer ?? ""} accent={tip.footerAccent ?? ""} /></div>
          <div style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 28, color: MUTED, marginTop: 8 }}>{tip.note}</div>
        </div>
      </Glass>
    </AbsoluteFill>
  );
};

// Any other tip kind: the step and its label over the scene.
const TipPlain: React.FC<{ n: string; image: string; tip: any; duration: number }> = ({ n, image, tip, duration }) => (
  <AbsoluteFill>
    <Backdrop image={image} duration={duration} blur={4} dim={0.55} />
    <StepHeader n={n} label={tip?.label ?? ""} image={image} />
  </AbsoluteFill>
);

// CTA: the send, shown. A glass share sheet, a tap on the friend, SEND flips to
// SENT, a paper plane leaves; the hook stamps back in for the loop.
const Close: React.FC<{ image: string; close: Props["close"]; hook: Props["hookText"]; duration: number }> = ({ image, close, hook, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = ease(frame, 2, 16);
  const sheet = ease(frame, 8, 24);
  const tapAt = 32;
  const tapped = frame >= tapAt;
  const ripple = interpolate(frame, [tapAt, tapAt + 16], [0, 1], clamp);
  const plane = interpolate(frame, [tapAt + 4, tapAt + 30], [0, 1], { ...clamp, easing: EASE });
  const loopAt = Math.max(0, duration - 22);
  const loop = spring({ frame: frame - loopAt, fps, config: { damping: 9, mass: 0.6, stiffness: 210 } });
  const contacts = close.contacts ?? [{ initial: "J", name: "Jay" }, { initial: "M", name: "Mom" }, { initial: "R", name: "Roommate" }];
  const px = interpolate(plane, [0, 1], [480, 1120]);
  const py = interpolate(plane, [0, 1], [1110, 640]) - Math.sin(plane * Math.PI) * 150;
  return (
    <AbsoluteFill>
      <Backdrop image={image} duration={duration} dim={0.55} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 400, opacity: a, transform: `translateY(${(1 - a) * 40}px)` }}>
        <div style={{ fontFamily: "Anton", fontSize: 128, lineHeight: 0.92, color: WHITE, textShadow: TEXT_SHADOW }}>{close.lead}</div>
        <div style={{ marginTop: 12, fontFamily: "Anton", fontSize: 96, lineHeight: 0.96, color: GOLD, textShadow: GOLD_GLOW }}>{close.sendTo}</div>
      </div>
      <Glass style={{ left: 60, right: 60, top: 790, opacity: Math.min(1, sheet * 1.6), transform: `translateY(${(1 - sheet) * 260}px)` }}
        inner={{ padding: "28px 36px 32px" }}>
        <div style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 30, color: MUTED, letterSpacing: 2 }}>Send to</div>
        <div style={{ display: "flex", gap: 44, marginTop: 20 }}>
          {contacts.map((c, i) => {
            const chosen = i === 0;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 130, height: 130, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: chosen && tapped ? GOLD : "rgba(255,248,236,0.12)", color: chosen && tapped ? BG : WHITE, fontFamily: "Anton", fontSize: 60,
                  border: "1.5px solid rgba(255,248,236,0.2)",
                  boxShadow: chosen && tapped ? `0 0 0 ${6 + 20 * ripple}px rgba(255,200,61,${0.5 * (1 - ripple)}), 0 0 40px rgba(255,200,61,0.4)` : "none",
                  transform: chosen && tapped ? `scale(${interpolate(ripple, [0, 0.25, 1], [1, 0.9, 1])})` : "none" }}>
                  {c.initial}
                </div>
                <span style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 26, color: chosen ? WHITE : MUTED }}>{c.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 26, height: 96, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center",
          background: tapped ? GOLD : "rgba(255,248,236,0.12)", color: tapped ? BG : WHITE, fontFamily: "DM Sans", fontWeight: 900, fontSize: 42, letterSpacing: 6,
          boxShadow: tapped ? "0 0 44px rgba(255,200,61,0.45)" : "none" }}>{tapped ? "SENT" : "SEND"}</div>
      </Glass>
      {plane > 0 && plane < 1 ? (
        <>
          {[0.08, 0.16, 0.24].map((lag, i) => {
            const q = Math.max(0, plane - lag);
            return <div key={i} style={{ position: "absolute", width: 14 - i * 3, height: 14 - i * 3, borderRadius: "50%", background: GOLD, opacity: 0.6 - i * 0.18,
              left: interpolate(q, [0, 1], [480, 1120]) + 50, top: interpolate(q, [0, 1], [1110, 640]) - Math.sin(q * Math.PI) * 150 + 60, boxShadow: "0 0 16px rgba(255,200,61,0.8)" }} />;
          })}
          <svg width="130" height="130" viewBox="0 0 24 24" style={{ position: "absolute", left: px, top: py, filter: "drop-shadow(0 0 14px rgba(255,200,61,0.8))",
            transform: `rotate(${interpolate(plane, [0, 1], [-10, -32])}deg)`, opacity: interpolate(plane, [0, 0.8, 1], [1, 1, 0]) }}>
            <path d="M2 11.5 L22 3 L16 21 L11.5 13.5 Z" fill={GOLD} />
            <path d="M11.5 13.5 L22 3" stroke={BG} strokeWidth="1.2" />
          </svg>
        </>
      ) : null}
      {frame >= loopAt ? (
        <div style={{ position: "absolute", left: 90, right: 90, top: 560, textAlign: "center", fontFamily: "Anton", fontSize: bigSize(hook.big, 820, 180), lineHeight: 0.95,
          color: WHITE, background: "rgba(11,9,7,0.82)", border: `4px solid ${GOLD}`, borderRadius: 38, padding: "22px 10px",
          boxShadow: "0 0 60px rgba(255,200,61,0.35)", transform: `rotate(-5deg) scale(${interpolate(loop, [0, 1], [2.3, 1])})`, opacity: Math.min(1, loop * 1.5) }}>
          <Accented text={hook.big} accent={hook.accent} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// Captions: the phrase being spoken, big white words, the current word lit gold.
const Captions: React.FC<{ words: Props["words"] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i].from <= frame) idx = i;
  if (idx < 0) return null;
  const line = words[idx].line;
  const lineWords = words.map((w, i) => ({ ...w, i })).filter((w) => w.line === line);
  const chunks: (typeof lineWords)[] = [];
  let cur: typeof lineWords = [];
  for (const w of lineWords) { cur.push(w); if (cur.length >= 4 || /[.,:?!]$/.test(w.text)) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  for (let k = chunks.length - 1; k > 0; k--) {
    const prev = chunks[k - 1];
    if (chunks[k].length === 1 && prev.length <= 4 && !/[.:?!]$/.test(prev[prev.length - 1].text)) { prev.push(...chunks[k]); chunks.splice(k, 1); }
  }
  const chunk = chunks.find((ch) => ch.some((w) => w.i === idx)) ?? [];
  const pop = spring({ frame: frame - words[idx].from, fps, config: { damping: 12, mass: 0.4, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: 50, right: 50, top: 1300, minHeight: 170, display: "flex", flexWrap: "wrap",
      alignItems: "center", justifyContent: "center", columnGap: 20, rowGap: 2 }}>
      {chunk.map((w) => {
        const active = w.i === idx;
        return (
          <span key={w.i} style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 74, lineHeight: 1.08, textTransform: "uppercase",
            color: active ? GOLD : WHITE, display: "inline-block",
            textShadow: active ? GOLD_GLOW : "0 4px 18px rgba(0,0,0,0.75), 0 2px 2px rgba(0,0,0,0.6)",
            transform: active ? `scale(${interpolate(pop, [0, 1], [1.22, 1.05])}) translateY(${interpolate(pop, [0, 1], [-6, 0])}px)` : "none" }}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const CinematicTipReel: React.FC<Props> = (props) => {
  const by = Object.fromEntries(props.scenes.map((s) => [s.id, s]));
  const seq = (id: string, render: (duration: number) => React.ReactNode) => {
    const s = by[id];
    if (!s) return null;
    const d = Math.max(1, s.to - s.from);
    return <Sequence key={id} from={s.from} durationInFrames={d}>{render(d)}{id !== "hook" ? <Flash /> : null}</Sequence>;
  };
  const tip2: any = props.tip2 ?? {};
  const tip3: any = props.tip3 ?? {};
  return (
    <AbsoluteFill style={{ background: BG }}>
      {props.audio ? <Audio src={staticFile(props.audio)} /> : null}
      {seq("hook", (d) => <Hook image={props.images.hook} hook={props.hookText} duration={d}
        shakeAt={props.shakeAt != null && by.hook ? props.shakeAt - by.hook.from : null} />)}
      {seq("lock", (d) => <Lock image={props.images.lock} lock={props.lock} duration={d} />)}
      {seq("tip1", (d) => <Tip1 image={props.images.tip1} tip={props.tip1} duration={d} />)}
      {seq("tip2", (d) => tip2.kind === "recurring"
        ? <Tip2Recurring image={props.images.tip2} tip={tip2} duration={d} />
        : <TipPlain n="02" image={props.images.tip2} tip={tip2} duration={d} />)}
      {seq("tip3", (d) => tip3.kind === "growth"
        ? <Tip3Growth image={props.images.tip3} tip={tip3} duration={d} />
        : <TipPlain n="03" image={props.images.tip3} tip={tip3} duration={d} />)}
      {seq("close", (d) => <Close image={props.images.close} close={props.close} hook={props.hookText} duration={d} />)}
      <Atmosphere />
      <Chrome topic={props.topic} scenes={props.scenes} />
      <Captions words={props.words} />
    </AbsoluteFill>
  );
};
