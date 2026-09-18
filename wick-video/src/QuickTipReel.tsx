import React from "react";
import {
  AbsoluteFill, Audio, Easing, Img, Sequence, continueRender, delayRender,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { z } from "zod";

// ─── QUICK TIP REEL (18s) ────────────────────────────────────────────────────
// Dre, 2026-09-15: "make the voice better sound human, it should be 18 seconds
// long and use hook stacking... say something that grabs attention then say
// something that retains that attention, fill in blank spaces, make the video
// feel more interesting and educational, it should be quick tips they can apply
// today."
//
// Hook stack in the first 2 seconds: the VISUAL hook (Wick punching in) and the
// TEXT hook ("3X THE FEE") are on frame one, the SPOKEN hook sharpens them rather
// than repeating them, and the context lock ("three steps, tonight") lands by 3s.
// Then three tips, each SHOWN, not just said: a phone search, fee bars, a receipt
// with the expensive line struck out. The end stamps the hook again so the loop
// back to frame one reads as a rewatch.
//
// One continuous voice take (a single TTS request) with word timings, so the
// captions track the voice exactly. Voice only: no music, no sound effects; Dre
// adds his own. No marker highlights: the active caption word changes colour.

const PAPER = "#F7F3EA";
const INK = "#141C2B";
const SOFT = "#5A6472";
const ACCENT = "#D9730D";
const RED = "#D64545";

const fontHandle = delayRender("quick tip fonts");
let fontsReleased = false;
const releaseFonts = () => { if (!fontsReleased) { fontsReleased = true; continueRender(fontHandle); } };
setTimeout(releaseFonts, 6000);
Promise.all([
  new FontFace("Anton", `url(${staticFile("fonts/Anton-Regular.ttf")})`).load(),
  new FontFace("DM Sans", `url(${staticFile("fonts/DMSans.ttf")})`, { weight: "100 900" }).load(),
]).then((faces) => { faces.forEach((f) => (document.fonts as any).add(f)); releaseFonts(); })
  .catch(releaseFonts);

export const quickTipSchema = z.object({
  topic: z.string(),
  audio: z.string().nullable(),
  durationInFrames: z.number(),
  shakeAt: z.number().nullable(),
  hookText: z.object({ kicker: z.string(), big: z.string(), accent: z.string() }),
  lock: z.object({ big: z.string(), accent: z.string(), stamp: z.string() }),
  tip1: z.object({ label: z.string(), query: z.string(), results: z.array(z.object({ ticker: z.string(), name: z.string() })) }),
  // Tip scenes come in kinds (fee bars, receipt, recurring buy, growth), so their shape varies.
  tip2: z.any(),
  tip3: z.any(),
  close: z.object({ lead: z.string(), sendTo: z.string(),
    contacts: z.array(z.object({ initial: z.string(), name: z.string() })).optional() }),
  images: z.object({ hook: z.string(), lock: z.string(), tip1: z.string(), tip2: z.string(), tip3: z.string(), close: z.string() }),
  scenes: z.array(z.object({ id: z.string(), from: z.number(), to: z.number() })),
  words: z.array(z.object({ text: z.string(), from: z.number(), to: z.number(), line: z.number() })),
});
type Props = z.infer<typeof quickTipSchema>;

const src = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));
// Anton runs about 0.47em per character: size a headline from the width it has.
const bigSize = (text: string, avail: number, max: number) => Math.min(max, Math.floor(avail / (Math.max(3, text.length) * 0.47)));

// Every scene opens with a punch: a hard scale-in that breaks the rhythm.
const usePunch = (delay = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return spring({ frame: frame - delay, fps, config: { damping: 11, mass: 0.5, stiffness: 190 } });
};

const Card: React.FC<{ image: string; style: React.CSSProperties }> = ({ image, style }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: "absolute", borderRadius: 36, overflow: "hidden", background: "#1a120b",
      boxShadow: "0 28px 56px rgba(20,28,43,0.24)", ...style }}>
      <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover",
        transform: `scale(${interpolate(frame, [0, 120], [1.12, 1.0], { extrapolateRight: "clamp" })})` }} />
    </div>
  );
};

const Accented: React.FC<{ text: string; accent: string; color?: string }> = ({ text, accent, color = INK }) => {
  const i = accent ? text.indexOf(accent) : -1;
  if (i < 0) return <span style={{ color }}>{text}</span>;
  return <span style={{ color }}>{text.slice(0, i)}<span style={{ color: ACCENT }}>{accent}</span>{text.slice(i + accent.length)}</span>;
};

const Background: React.FC<{ ghost: string }> = ({ ghost }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <AbsoluteFill style={{
        backgroundImage: "linear-gradient(rgba(20,28,43,0.05) 2px, transparent 2px), linear-gradient(90deg, rgba(20,28,43,0.05) 2px, transparent 2px)",
        backgroundSize: "90px 90px", backgroundPosition: `0px ${-frame * 1.5}px` }} />
      <div style={{ position: "absolute", left: -40, top: 1480, fontFamily: "Anton", fontSize: 520, lineHeight: 1,
        color: "rgba(20,28,43,0.045)", whiteSpace: "nowrap", transform: `translateX(${-frame * 1.2}px)` }}>{`${ghost} ${ghost} ${ghost}`}</div>
      <AbsoluteFill style={{ background: "radial-gradient(90% 60% at 50% 42%, rgba(255,255,255,0.55) 0%, rgba(247,243,234,0) 62%, rgba(20,28,43,0.07) 100%)" }} />
    </AbsoluteFill>
  );
};

const Chrome: React.FC<{ topic: string; scenes: Props["scenes"] }> = ({ topic, scenes }) => {
  const frame = useCurrentFrame();
  return (
    <>
      <div style={{ position: "absolute", top: 268, left: 60, right: 60, display: "flex", gap: 8 }}>
        {scenes.map((s, i) => {
          const p = interpolate(frame, [s.from, Math.max(s.from + 1, s.to)], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{ flex: 1, height: 8, borderRadius: 8, background: "rgba(20,28,43,0.12)", overflow: "hidden" }}>
              <div style={{ width: `${p * 100}%`, height: "100%", background: INK }} />
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", top: 298, left: 60, right: 60, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 26, letterSpacing: 5, textTransform: "uppercase",
          color: PAPER, background: INK, padding: "10px 22px", borderRadius: 999 }}>{topic}</span>
        <span style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 26, letterSpacing: 4, color: SOFT }}>@WICKSWISDOM</span>
      </div>
    </>
  );
};

const StepHeader: React.FC<{ n: string; label: string; image?: string }> = ({ n, label, image }) => {
  const p = usePunch();
  const l = usePunch(3);
  return (
    <>
      <div style={{ position: "absolute", left: 60, top: 372, fontFamily: "Anton", fontSize: 170, lineHeight: 0.9, color: ACCENT,
        transform: `scale(${interpolate(p, [0, 1], [1.6, 1])})`, transformOrigin: "left top", opacity: Math.min(1, p * 2) }}>{n}</div>
      <div style={{ position: "absolute", left: 270, right: image ? 280 : 60, top: 388, fontFamily: "Anton", fontSize: 84, lineHeight: 0.98,
        color: INK, textTransform: "uppercase", opacity: l, transform: `translateX(${interpolate(l, [0, 1], [60, 0])}px)` }}>{label}</div>
      {image ? <Card image={image} style={{ right: 60, top: 372, width: 200, height: 200, transform: `rotate(4deg) scale(${interpolate(l, [0, 1], [0.6, 1])})` }} /> : null}
    </>
  );
};

const HookScene: React.FC<{ image: string; hook: Props["hookText"]; shakeAt: number | null }> = ({ image, hook, shakeAt }) => {
  const frame = useCurrentFrame();
  const p = usePunch();
  const t = usePunch(2);
  const shake = shakeAt != null && frame >= shakeAt && frame < shakeAt + 10 ? Math.sin((frame - shakeAt) * 2.6) * 16 : 0;
  return (
    <AbsoluteFill style={{ transform: `translateX(${shake}px)` }}>
      <Card image={image} style={{ left: 60, right: 60, top: 372, height: 560,
        transform: `scale(${interpolate(p, [0, 1], [1.22, 1])}) rotate(-1.5deg)` }} />
      <div style={{ position: "absolute", left: 60, top: 962, fontFamily: "DM Sans", fontWeight: 900, fontSize: 34, letterSpacing: 6,
        color: PAPER, background: INK, padding: "10px 22px", borderRadius: 14, transform: `rotate(-2deg) scale(${interpolate(t, [0, 1], [0.75, 1])})`, transformOrigin: "left center" }}>
        {hook.kicker}
      </div>
      <div style={{ position: "absolute", left: 52, right: 40, top: 1020, fontFamily: "Anton", fontSize: bigSize(hook.big, 880, 200), lineHeight: 0.92,
        transform: `scale(${interpolate(t, [0, 1], [1.08, 1])})`, transformOrigin: "left top" }}>
        <Accented text={hook.big} accent={hook.accent} />
      </div>
    </AbsoluteFill>
  );
};

const LockScene: React.FC<{ image: string; lock: Props["lock"] }> = ({ image, lock }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = usePunch();
  const stamp = spring({ frame: frame - 12, fps, config: { damping: 9, mass: 0.6, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 60, top: 372, fontFamily: "Anton", fontSize: bigSize(lock.big, 960, 230), lineHeight: 0.9,
        transform: `scale(${interpolate(p, [0, 1], [1.3, 1])})`, transformOrigin: "left top" }}>
        <Accented text={lock.big} accent={lock.accent} />
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 610, display: "flex", gap: 22 }}>
        {["01", "02", "03"].map((n, i) => {
          const s = spring({ frame: frame - 3 - i * 4, fps, config: { damping: 12, mass: 0.5 } });
          return (
            <div key={n} style={{ flex: 1, height: 170, borderRadius: 30, background: i === 0 ? ACCENT : INK, color: PAPER,
              display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton", fontSize: 110,
              transform: `translateY(${interpolate(s, [0, 1], [80, 0])}px)`, opacity: s }}>{n}</div>
          );
        })}
      </div>
      <Card image={image} style={{ left: 60, top: 830, width: 400, height: 380, transform: `rotate(-3deg) scale(${interpolate(p, [0, 1], [0.8, 1])})` }} />
      <div style={{ position: "absolute", left: 510, right: 60, top: 900, height: 200, border: `10px solid ${ACCENT}`, borderRadius: 26,
        display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Anton", fontSize: 120, color: ACCENT,
        transform: `rotate(-7deg) scale(${interpolate(stamp, [0, 1], [2.2, 1])})`, opacity: Math.min(1, stamp * 1.4) }}>{lock.stamp}</div>
    </AbsoluteFill>
  );
};

const Tip1Scene: React.FC<{ image: string; tip: Props["tip1"] }> = ({ image, tip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const typed = tip.query.slice(0, Math.max(0, Math.floor((frame - 8) / 3)));
  const doneAt = 8 + tip.query.length * 3;
  const caret = Math.floor(frame / 8) % 2 === 0;
  const phone = usePunch(1);
  return (
    <AbsoluteFill>
      <StepHeader n="01" label={tip.label} />
      <div style={{ position: "absolute", left: 60, top: 600, width: 560, height: 600, borderRadius: 56, background: INK, padding: 22,
        transform: `translateY(${interpolate(phone, [0, 1], [120, 0])}px) rotate(-2deg)`, boxShadow: "0 30px 60px rgba(20,28,43,0.3)" }}>
        <div style={{ width: "100%", height: "100%", borderRadius: 38, background: "#FFFFFF", padding: "34px 26px", overflow: "hidden" }}>
          <div style={{ height: 84, borderRadius: 42, background: "#EEF0F3", display: "flex", alignItems: "center", gap: 16, padding: "0 26px" }}>
            <div style={{ width: 30, height: 30, borderRadius: "50%", border: `5px solid ${SOFT}`, position: "relative" }} />
            <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 40, color: INK }}>{typed}</span>
            <span style={{ width: 4, height: 44, background: caret ? ACCENT : "transparent" }} />
          </div>
          {tip.results.map((r, i) => {
            const s = spring({ frame: frame - doneAt - i * 5, fps, config: { damping: 200 } });
            return (
              <div key={r.ticker} style={{ marginTop: 26, padding: "22px 22px", borderRadius: 24, opacity: s,
                transform: `translateY(${interpolate(s, [0, 1], [30, 0])}px)`,
                borderLeft: `10px solid ${i === 0 ? ACCENT : "#D8DCE2"}`, background: i === 0 ? "rgba(217,115,13,0.07)" : "#F6F7F9" }}>
                <div style={{ fontFamily: "Anton", fontSize: 56, lineHeight: 1, color: INK }}>{r.ticker}</div>
                <div style={{ fontFamily: "DM Sans", fontWeight: 600, fontSize: 28, color: SOFT, marginTop: 6 }}>{r.name}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Card image={image} style={{ right: 60, top: 700, width: 360, height: 420, transform: `rotate(4deg) scale(${interpolate(phone, [0, 1], [0.7, 1])})` }} />
    </AbsoluteFill>
  );
};

const Tip2Scene: React.FC<{ image: string; tip: Props["tip2"] }> = ({ image, tip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const max = Math.max(...tip.bars.map((b) => b.value));
  const callout = spring({ frame: frame - 22, fps, config: { damping: 9, mass: 0.6, stiffness: 200 } });
  return (
    <AbsoluteFill>
      <StepHeader n="02" label={tip.label} image={image} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 640, display: "flex", flexDirection: "column", gap: 40 }}>
        {tip.bars.map((b, i) => {
          const g = spring({ frame: frame - 6 - i * 6, fps, config: { damping: 200, mass: 0.9 } });
          const bad = i === tip.bars.length - 1;
          return (
            <div key={b.ticker}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12 }}>
                <span style={{ fontFamily: "Anton", fontSize: 76, lineHeight: 1, color: INK }}>{b.ticker}</span>
                <span style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 52, color: bad ? RED : INK, opacity: g }}>{b.text}</span>
              </div>
              <div style={{ height: 96, borderRadius: 26, background: "rgba(20,28,43,0.08)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${Math.max(4, (b.value / max) * 100) * g}%`, borderRadius: 26, background: bad ? RED : INK }} />
              </div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", right: 70, top: 1080, fontFamily: "Anton", fontSize: 110, color: PAPER, background: ACCENT,
        padding: "4px 30px", borderRadius: 24, transform: `rotate(-6deg) scale(${interpolate(callout, [0, 1], [2, 1])})`, opacity: Math.min(1, callout * 1.4) }}>
        {tip.callout}
      </div>
    </AbsoluteFill>
  );
};

const Tip3Scene: React.FC<{ image: string; tip: Props["tip3"] }> = ({ image, tip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const a = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  const strike = interpolate(frame, [20, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const foot = spring({ frame: frame - 26, fps, config: { damping: 12, mass: 0.6 } });
  const cardBase: React.CSSProperties = { flex: 1, height: 330, borderRadius: 36, padding: "30px 34px", display: "flex", flexDirection: "column", justifyContent: "space-between" };
  return (
    <AbsoluteFill>
      <StepHeader n="03" label={tip.label} image={image} />
      <div style={{ position: "absolute", left: 60, top: 612, fontFamily: "DM Sans", fontWeight: 900, fontSize: 34, letterSpacing: 5, color: SOFT }}>{tip.basis}</div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 670, display: "flex", gap: 24, opacity: a,
        transform: `translateY(${interpolate(a, [0, 1], [60, 0])}px)` }}>
        <div style={{ ...cardBase, background: INK }}>
          <span style={{ fontFamily: "Anton", fontSize: 64, lineHeight: 1, color: PAPER }}>{tip.good.ticker}</span>
          <span style={{ fontFamily: "Anton", fontSize: 150, lineHeight: 1, color: PAPER }}>{tip.good.amount}</span>
        </div>
        <div style={{ ...cardBase, background: PAPER, border: `8px solid ${RED}`, position: "relative" }}>
          <span style={{ fontFamily: "Anton", fontSize: 64, lineHeight: 1, color: RED }}>{tip.bad.ticker}</span>
          <span style={{ fontFamily: "Anton", fontSize: 150, lineHeight: 1, color: RED, position: "relative" }}>
            {tip.bad.amount}
            <span style={{ position: "absolute", left: -6, top: "52%", height: 14, width: `${strike * 104}%`, background: INK, borderRadius: 8, transform: "rotate(-6deg)" }} />
          </span>
        </div>
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1040, opacity: foot, transform: `scale(${interpolate(foot, [0, 1], [1.3, 1])})`, transformOrigin: "left center" }}>
        <div style={{ fontFamily: "Anton", fontSize: 88, lineHeight: 1 }}><Accented text={tip.footer} accent={tip.footerAccent} /></div>
        <div style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 34, color: SOFT, marginTop: 8 }}>{tip.note}</div>
      </div>
    </AbsoluteFill>
  );
};

// TIP SCENE: a recurring buy being switched on (auto-invest). Generic app UI, no logos.
const RecurringScene: React.FC<{ image: string; tip: any }> = ({ image, tip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = usePunch(2);
  const toggle = interpolate(frame, [26, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const on = toggle > 0.5;
  const rows = (tip.rows ?? []) as { k: string; v: string }[];
  return (
    <AbsoluteFill>
      <StepHeader n="02" label={tip.label} image={image} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 620, borderRadius: 44, background: "#FFFFFF", padding: "34px 40px",
        boxShadow: "0 30px 60px rgba(20,28,43,0.2)", transform: `translateY(${interpolate(card, [0, 1], [160, 0])}px)`, opacity: Math.min(1, card * 1.5) }}>
        <div style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 32, color: SOFT, letterSpacing: 4 }}>{tip.title}</div>
        {rows.map((r, i) => {
          const s = spring({ frame: frame - 8 - i * 5, fps, config: { damping: 200 } });
          return (
            <div key={r.k} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "20px 0",
              borderBottom: "3px solid #EEF0F3", opacity: s, transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)` }}>
              <span style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 40, color: SOFT }}>{r.k}</span>
              <span style={{ fontFamily: "Anton", fontSize: 66, color: INK }}>{r.v}</span>
            </div>
          );
        })}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 28 }}>
          <span style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 46, color: on ? ACCENT : INK }}>{on ? tip.onText : tip.offText}</span>
          <div style={{ position: "relative", width: 156, height: 88, borderRadius: 44, background: on ? ACCENT : "#D8DCE2" }}>
            <div style={{ position: "absolute", top: 9, left: interpolate(toggle, [0, 1], [9, 77]), width: 70, height: 70, borderRadius: "50%",
              background: "#FFFFFF", boxShadow: "0 4px 10px rgba(0,0,0,0.2)" }} />
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// TIP SCENE: the same money over time, bars growing with the totals counting up.
const GrowthScene: React.FC<{ image: string; tip: any }> = ({ image, tip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bars = (tip.bars ?? []) as { label: string; value: number }[];
  const max = Math.max(1, ...bars.map((b) => b.value));
  const foot = spring({ frame: frame - 30, fps, config: { damping: 12, mass: 0.6 } });
  const chartH = 330;
  return (
    <AbsoluteFill>
      <StepHeader n="03" label={tip.label} image={image} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 610, height: chartH + 150, display: "flex", alignItems: "flex-end", gap: 30 }}>
        {bars.map((b, i) => {
          const g = interpolate(frame, [3 + i * 7, 27 + i * 7], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.out(Easing.cubic) });
          const last = i === bars.length - 1;
          return (
            <div key={b.label} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
              <span style={{ fontFamily: "Anton", fontSize: last ? 72 : 50, lineHeight: 1, color: last ? ACCENT : INK, opacity: Math.min(1, g * 1.4) }}>
                {"$" + Math.round(b.value * g).toLocaleString("en-US")}
              </span>
              <div style={{ width: "100%", height: Math.max(10, (b.value / max) * chartH * g), borderRadius: 22, background: last ? ACCENT : INK }} />
              <span style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 30, letterSpacing: 2, color: SOFT }}>{b.label}</span>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 60, right: 60, top: 1128, opacity: foot, transform: `scale(${interpolate(foot, [0, 1], [1.2, 1])})`, transformOrigin: "left center" }}>
        <div style={{ fontFamily: "Anton", fontSize: 74, lineHeight: 1 }}><Accented text={tip.footer} accent={tip.footerAccent} /></div>
        <div style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 30, color: SOFT, marginTop: 6 }}>{tip.note}</div>
      </div>
    </AbsoluteFill>
  );
};

// CTA — Dre, 2026-09-15: "better CTA". Sends are the strongest ranking signal and
// the page asks for shares only until 1k followers, so the close SHOWS the send:
// a share sheet slides up, a tap lands on the friend the hook was about, the
// button flips to SENT, and a paper plane leaves for the share button. The
// spoken line calls back to the hook ("still paying triple") and the hook stamp
// lands last, so the loop back to frame one reads as a rewatch.
const CloseScene: React.FC<{ image: string; close: Props["close"]; hook: Props["hookText"] }> = ({ image, close, hook }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
  const p = usePunch();
  const t = spring({ frame: frame - 2, fps, config: { damping: 200 } });
  const sheet = spring({ frame: frame - 10, fps, config: { damping: 16, mass: 0.7 } });
  const tapAt = 32;
  const tapped = frame >= tapAt;
  const ripple = interpolate(frame, [tapAt, tapAt + 16], [0, 1], clamp);
  const plane = interpolate(frame, [tapAt + 4, tapAt + 28], [0, 1], clamp);
  const loopAt = Math.max(0, durationInFrames - 22);
  const loop = spring({ frame: frame - loopAt, fps, config: { damping: 9, mass: 0.6, stiffness: 210 } });
  const contacts = close.contacts ?? [{ initial: "J", name: "Jay · SPY" }, { initial: "M", name: "Mom" }, { initial: "R", name: "Roommate" }];
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 60, right: 300, top: 380, fontFamily: "Anton", fontSize: 120, lineHeight: 0.92, color: INK,
        opacity: t, transform: `translateY(${interpolate(t, [0, 1], [40, 0])}px)` }}>{close.lead}</div>
      <div style={{ position: "absolute", left: 60, right: 290, top: 505, fontFamily: "Anton", fontSize: 92, lineHeight: 0.95, color: ACCENT,
        opacity: t, transform: `translateY(${interpolate(t, [0, 1], [60, 0])}px)` }}>{close.sendTo}</div>
      <Card image={image} style={{ right: 60, top: 360, width: 210, height: 210, transform: `rotate(5deg) scale(${interpolate(p, [0, 1], [0.6, 1])})` }} />
      <div style={{ position: "absolute", left: 60, right: 60, top: 810, height: 430, borderRadius: 40, background: "#FFFFFF", padding: "30px 38px",
        boxShadow: "0 30px 60px rgba(20,28,43,0.22)", opacity: sheet, transform: `translateY(${interpolate(sheet, [0, 1], [320, 0])}px)` }}>
        <div style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 34, color: INK }}>Send to</div>
        <div style={{ display: "flex", gap: 46, marginTop: 22 }}>
          {contacts.map((c, i) => {
            const chosen = i === 0;
            return (
              <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                <div style={{ position: "relative", width: 132, height: 132, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
                  background: chosen ? INK : "#E6E8EC", color: chosen ? PAPER : SOFT, fontFamily: "Anton", fontSize: 62,
                  boxShadow: chosen && tapped ? `0 0 0 ${6 + 18 * ripple}px rgba(217,115,13,${0.55 * (1 - ripple)})` : "none",
                  transform: chosen && tapped ? `scale(${interpolate(ripple, [0, 0.25, 1], [1, 0.9, 1])})` : "none" }}>
                  {c.initial}
                  {chosen && tapped ? (
                    <div style={{ position: "absolute", right: -6, bottom: -6, width: 52, height: 52, borderRadius: "50%", background: ACCENT, border: "5px solid #fff" }}>
                      <div style={{ position: "absolute", left: 14, top: 6, width: 12, height: 22, border: "solid #fff", borderWidth: "0 5px 5px 0", transform: "rotate(45deg)" }} />
                    </div>
                  ) : null}
                </div>
                <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 26, color: chosen ? INK : SOFT }}>{c.name}</span>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 26, height: 96, borderRadius: 28, display: "flex", alignItems: "center", justifyContent: "center",
          background: tapped ? ACCENT : INK, color: PAPER, fontFamily: "DM Sans", fontWeight: 900, fontSize: 44, letterSpacing: 4 }}>
          {tapped ? "SENT" : "SEND"}
        </div>
      </div>
      {plane > 0 && plane < 1 ? (
        <svg width="130" height="130" viewBox="0 0 24 24" style={{ position: "absolute",
          left: interpolate(plane, [0, 1], [470, 1120]), top: interpolate(plane, [0, 1], [1110, 700]) - Math.sin(plane * Math.PI) * 140,
          transform: `rotate(${interpolate(plane, [0, 1], [-10, -32])}deg)`, opacity: interpolate(plane, [0, 0.8, 1], [1, 1, 0]) }}>
          <path d="M2 11.5 L22 3 L16 21 L11.5 13.5 Z" fill={ACCENT} />
          <path d="M11.5 13.5 L22 3" stroke="#FFFFFF" strokeWidth="1.4" />
        </svg>
      ) : null}
      {frame >= loopAt ? (
        <div style={{ position: "absolute", left: 120, right: 120, top: 560, textAlign: "center", fontFamily: "Anton", fontSize: bigSize(hook.big, 800, 190), lineHeight: 0.92,
          color: PAPER, background: INK, borderRadius: 34, padding: "20px 10px", transform: `rotate(-5deg) scale(${interpolate(loop, [0, 1], [2.4, 1])})`,
          opacity: Math.min(1, loop * 1.5) }}>
          <Accented text={hook.big} accent={hook.accent} color={PAPER} />
        </div>
      ) : null}
    </AbsoluteFill>
  );
};

// Captions: the line being spoken, four words at a time; the word being said turns orange.
const Captions: React.FC<{ words: Props["words"] }> = ({ words }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  let idx = -1;
  for (let i = 0; i < words.length; i++) if (words[i].from <= frame) idx = i;
  if (idx < 0) return null;
  const line = words[idx].line;
  // Chunks break at natural phrases (punctuation) or four words, whichever comes
  // first, so a phrase like "on ten grand" is never split across two cards.
  const lineWords = words.map((w, i) => ({ ...w, i })).filter((w) => w.line === line);
  const chunks: (typeof lineWords)[] = [];
  let cur: typeof lineWords = [];
  for (const w of lineWords) { cur.push(w); if (cur.length >= 4 || /[.,:?!]$/.test(w.text)) { chunks.push(cur); cur = []; } }
  if (cur.length) chunks.push(cur);
  // A lone trailing word ("BUY.") reads like a glitch: fold it into the chunk before,
  // unless that chunk ended a sentence ("SPY?" stays on its own).
  for (let k = chunks.length - 1; k > 0; k--) {
    const prev = chunks[k - 1];
    if (chunks[k].length === 1 && prev.length <= 4 && !/[.:?!]$/.test(prev[prev.length - 1].text)) { prev.push(...chunks[k]); chunks.splice(k, 1); }
  }
  const chunk = chunks.find((ch) => ch.some((w) => w.i === idx)) ?? [];
  const pop = spring({ frame: frame - words[idx].from, fps, config: { damping: 12, mass: 0.4, stiffness: 220 } });
  return (
    <div style={{ position: "absolute", left: 60, right: 60, top: 1262, minHeight: 190, borderRadius: 38, background: INK,
      display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "center", columnGap: 22, padding: "24px 34px",
      boxShadow: "0 24px 50px rgba(20,28,43,0.25)" }}>
      {chunk.map((w) => {
        const active = w.i === idx;
        return (
          <span key={w.i} style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 70, lineHeight: 1.1, textTransform: "uppercase",
            color: active ? ACCENT : PAPER, display: "inline-block", transform: active ? `scale(${interpolate(pop, [0, 1], [1.25, 1.06])})` : "none" }}>
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

export const QuickTipReel: React.FC<Props> = (props) => {
  const by = Object.fromEntries(props.scenes.map((s) => [s.id, s]));
  const seq = (id: string, node: React.ReactNode) => {
    const s = by[id];
    return s ? <Sequence key={id} from={s.from} durationInFrames={Math.max(1, s.to - s.from)}>{node}</Sequence> : null;
  };
  const hookScene = by.hook;
  return (
    <AbsoluteFill>
      <Background ghost={props.hookText.accent} />
      {props.audio ? <Audio src={staticFile(props.audio)} /> : null}
      {seq("hook", <HookScene image={props.images.hook} hook={props.hookText} shakeAt={props.shakeAt != null && hookScene ? props.shakeAt - hookScene.from : null} />)}
      {seq("lock", <LockScene image={props.images.lock} lock={props.lock} />)}
      {seq("tip1", <Tip1Scene image={props.images.tip1} tip={props.tip1} />)}
      {seq("tip2", props.tip2?.kind === "recurring" ? <RecurringScene image={props.images.tip2} tip={props.tip2} /> : <Tip2Scene image={props.images.tip2} tip={props.tip2} />)}
      {seq("tip3", props.tip3?.kind === "growth" ? <GrowthScene image={props.images.tip3} tip={props.tip3} /> : <Tip3Scene image={props.images.tip3} tip={props.tip3} />)}
      {seq("close", <CloseScene image={props.images.close} close={props.close} hook={props.hookText} />)}
      <Chrome topic={props.topic} scenes={props.scenes} />
      <Captions words={props.words} />
    </AbsoluteFill>
  );
};
