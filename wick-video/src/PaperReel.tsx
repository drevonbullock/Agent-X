import React from "react";
import {
  AbsoluteFill, Audio, Img, Series, continueRender, delayRender,
  interpolate, spring, staticFile, useCurrentFrame, useVideoConfig,
} from "remotion";
import { z } from "zod";

// ─── PAPER REEL ──────────────────────────────────────────────────────────────
// Dre, 2026-09-15, on the paper carousel: "the route you're looking at for this
// layout will be better used as a reel, with a voiceover in the background.
// If you do that, make sure you don't add any sound effects. I'll add my own."
//
// So: the paper look, cut to a narrator. Every scene lasts as long as its
// voice line (timing is measured by the builder), every beat has its OWN image,
// numbers count up, the checklist ticks off in time. The only audio is the
// voiceover. No music, no sound effects. No marker highlights either: Dre asked
// for those gone everywhere, so numbers are coloured text.
//
// Instagram's reel UI covers roughly the top 260px and everything below 1540px,
// so all content sits between those lines.

const PAPER = "#F7F3EA";
const INK = "#141C2B";
const SOFT = "#5A6472";
const ACCENT = "#D9730D";

// Fonts load once per render tab. The first render died at frame 1014 when one
// tab's load never settled and delayRender timed out, so the wait is capped: a
// stalled load releases the frame after 6s instead of killing the whole render.
const fontHandle = delayRender("paper reel fonts");
let fontsReleased = false;
const releaseFonts = () => { if (!fontsReleased) { fontsReleased = true; continueRender(fontHandle); } };
setTimeout(releaseFonts, 6000);
Promise.all([
  new FontFace("Anton", `url(${staticFile("fonts/Anton-Regular.ttf")})`).load(),
  new FontFace("DM Sans", `url(${staticFile("fonts/DMSans.ttf")})`, { weight: "100 900" }).load(),
]).then((faces) => { faces.forEach((f) => (document.fonts as any).add(f)); releaseFonts(); })
  .catch(releaseFonts);

export const paperReelSchema = z.object({
  topic: z.string(),
  hook: z.object({ headline: z.string(), image: z.string() }),
  beats: z.array(z.object({
    number: z.number(), title: z.string(), line: z.string(), how: z.string(),
    figure: z.string().nullable(), image: z.string(),
  })),
  close: z.object({ steps: z.array(z.string()), closing: z.string(), sendTo: z.string(), image: z.string() }),
  timing: z.object({ hook: z.number(), beats: z.array(z.number()), close: z.number() }).optional(),
  hasVoice: z.boolean().optional(),
  voDir: z.string().optional(),
});
type Props = z.infer<typeof paperReelSchema>;
type BeatT = Props["beats"][number];

const src = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));
const MONEY = /(\$\s?[\d,]+(?:\.\d+)?|\d[\d,.]*%)/g;
const isMoney = (p: string) => /^(\$\s?[\d,]+(?:\.\d+)?|\d[\d,.]*%)$/.test(p);
const colourNumbers = (text: string) =>
  text.split(MONEY).map((p, i) => (isMoney(p) ? <span key={i} style={{ color: ACCENT }}>{p}</span> : <React.Fragment key={i}>{p}</React.Fragment>));

const Card: React.FC<{ image: string; style: React.CSSProperties; zoom?: number }> = ({ image, style, zoom = 1 }) => (
  <div style={{ position: "absolute", borderRadius: 36, overflow: "hidden", background: "#1a120b",
    boxShadow: "0 30px 60px rgba(20,28,43,0.22)", ...style }}>
    <Img src={src(image)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${zoom})` }} />
  </div>
);

// Story-style progress: one segment per scene, the live one fills over its scene.
const Chrome: React.FC<{ topic: string; count: number; index: number; duration: number }> = ({ topic, count, index, duration }) => {
  const frame = useCurrentFrame();
  const p = Math.min(1, frame / Math.max(1, duration));
  return (
    <>
      <div style={{ position: "absolute", top: 272, left: 72, right: 72, display: "flex", gap: 10 }}>
        {Array.from({ length: count }).map((_, i) => (
          <div key={i} style={{ flex: 1, height: 8, borderRadius: 8, background: "rgba(20,28,43,0.12)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${i < index ? 100 : i === index ? p * 100 : 0}%`, background: INK }} />
          </div>
        ))}
      </div>
      <div style={{ position: "absolute", top: 306, left: 72, right: 72, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: "DM Sans", fontWeight: 800, fontSize: 26, letterSpacing: 5, textTransform: "uppercase",
          color: PAPER, background: INK, padding: "10px 22px", borderRadius: 999 }}>{topic}</span>
        <span style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 26, letterSpacing: 4, color: SOFT }}>@WICKSWISDOM</span>
      </div>
    </>
  );
};

const Hook: React.FC<{ headline: string; image: string }> = ({ headline, image }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame, fps, config: { damping: 14, mass: 0.8 } });
  const text = headline.toUpperCase().replace(/[.,!?\s]*HERE'?S\s+HOW[.,!?\s]*$/i, "").trim();
  const words = text.split(/\s+/);
  const size = text.length <= 30 ? 132 : text.length <= 45 ? 114 : 96;
  return (
    <AbsoluteFill>
      <Card image={image} zoom={interpolate(frame, [0, 180], [1.12, 1], { extrapolateRight: "clamp" })}
        style={{ left: 90, right: 90, top: 400, height: 640, opacity: card,
          transform: `scale(${interpolate(card, [0, 1], [0.86, 1])}) rotate(${interpolate(card, [0, 1], [-5, -1.5])}deg)` }} />
      <div style={{ position: "absolute", left: 72, right: 72, top: 1100, display: "flex", flexWrap: "wrap", columnGap: 26,
        fontFamily: "Anton", fontSize: size, lineHeight: 1.03, color: INK }}>
        {words.map((w, i) => {
          const s = spring({ frame: frame - 12 - i * 4, fps, config: { damping: 12, mass: 0.6 } });
          return (
            <span key={i} style={{ display: "inline-block", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [50, 0])}px)`,
              color: /[$\d]/.test(w) ? ACCENT : INK }}>{w}</span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// A figure counts up from zero to its value, keeping its own decimals and commas.
const countUp = (figure: string, t: number) => {
  const value = parseFloat(figure.replace(/[$,%\s]/g, "")) || 0;
  const decimals = (figure.split(".")[1] ?? "").replace(/\D/g, "").length;
  const n = (value * t).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return figure.trim().startsWith("$") ? `$${n}` : figure.includes("%") ? `${n}%` : n;
};

const Beat: React.FC<{ beat: BeatT; flip: boolean }> = ({ beat, flip }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const numIn = spring({ frame, fps, config: { damping: 200 } });
  const imgIn = spring({ frame: frame - 4, fps, config: { damping: 15, mass: 0.7 } });
  const count = interpolate(frame, [10, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const howIn = spring({ frame: frame - 36, fps, config: { damping: 200 } });
  const words = beat.line.split(/\s+/);
  // With a figure the sentence sits under it; without one it moves up and grows to fill the band.
  const lineTop = beat.figure ? 1060 : 900;
  const lineSize = beat.figure ? 52 : 60;
  const side = flip ? { left: 72 } : { right: 72 };
  const textSide = flip ? { left: 492, right: 72 } : { left: 72, right: 492 };
  // Capped so the numerals end above the sentence (they overlapped at 250px).
  const heroSize = beat.figure ? Math.min(220, Math.floor(936 / (Math.max(3, beat.figure.length) * 0.47))) : 0;
  return (
    <AbsoluteFill>
      <Card image={beat.image} zoom={interpolate(frame, [0, 200], [1.1, 1], { extrapolateRight: "clamp" })}
        style={{ ...side, top: 390, width: 380, height: 380, opacity: imgIn,
          transform: `translateX(${interpolate(imgIn, [0, 1], [flip ? -120 : 120, 0])}px) rotate(${flip ? -3 : 3}deg)` }} />
      <div style={{ position: "absolute", ...textSide, top: 400, opacity: numIn,
        transform: `translateY(${interpolate(numIn, [0, 1], [30, 0])}px)` }}>
        <div style={{ fontFamily: "Anton", fontSize: 120, lineHeight: 0.9, color: ACCENT }}>{String(beat.number).padStart(2, "0")}</div>
        <div style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 54, lineHeight: 1.04, color: INK, textTransform: "uppercase", marginTop: 18 }}>
          {beat.title}
        </div>
      </div>
      {beat.figure ? (
        <div style={{ position: "absolute", left: 66, right: 72, top: 810, fontFamily: "Anton", fontSize: heroSize, lineHeight: 1, color: INK, whiteSpace: "nowrap" }}>
          {countUp(beat.figure, count)}
        </div>
      ) : null}
      <div style={{ position: "absolute", left: 72, right: 72, top: lineTop, fontFamily: "DM Sans", fontWeight: 700, fontSize: lineSize, lineHeight: 1.18, color: INK }}>
        {words.map((w, i) => {
          const s = spring({ frame: frame - 14 - i * 2, fps, config: { damping: 200 } });
          return <span key={i} style={{ opacity: s, color: isMoney(w.replace(/[.,]$/, "")) ? ACCENT : INK }}>{w} </span>;
        })}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 1330, padding: "26px 32px", borderRadius: 28, background: INK,
        display: "flex", gap: 22, alignItems: "baseline", opacity: howIn, transform: `translateY(${interpolate(howIn, [0, 1], [40, 0])}px)` }}>
        <span style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 24, letterSpacing: 4, color: ACCENT, whiteSpace: "nowrap" }}>TONIGHT</span>
        <span style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 36, lineHeight: 1.22, color: PAPER }}>{beat.how}</span>
      </div>
    </AbsoluteFill>
  );
};

const Close: React.FC<{ close: Props["close"]; duration: number }> = ({ close, duration }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const n = close.steps.length;
  const stepGap = Math.max(10, Math.floor((duration * 0.6) / Math.max(1, n)));
  const endIn = spring({ frame: frame - (12 + n * stepGap), fps, config: { damping: 200 } });
  return (
    <AbsoluteFill>
      <div style={{ position: "absolute", left: 72, right: 72, top: 400, fontFamily: "Anton", fontSize: 120, lineHeight: 1, color: INK }}>
        YOUR <span style={{ color: ACCENT }}>{n}</span> MOVES
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 560, display: "flex", flexDirection: "column", gap: 26 }}>
        {close.steps.map((st, i) => {
          const at = 12 + i * stepGap;
          const s = spring({ frame: frame - at, fps, config: { damping: 200 } });
          const tick = spring({ frame: frame - at - 8, fps, config: { damping: 12, mass: 0.5 } });
          return (
            <div key={i} style={{ display: "flex", gap: 24, alignItems: "flex-start", opacity: s,
              transform: `translateX(${interpolate(s, [0, 1], [40, 0])}px)` }}>
              <div style={{ position: "relative", width: 48, height: 48, borderRadius: 12, border: `5px solid ${INK}`, flexShrink: 0, marginTop: 2,
                background: tick > 0.5 ? INK : "transparent" }}>
                <div style={{ position: "absolute", left: 13, top: 3, width: 12, height: 24, border: `solid ${PAPER}`, borderWidth: "0 5px 5px 0",
                  transform: `rotate(45deg) scale(${tick})` }} />
              </div>
              <div style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 38, lineHeight: 1.22, color: INK }}>{colourNumbers(st)}</div>
            </div>
          );
        })}
      </div>
      <div style={{ position: "absolute", left: 72, right: 72, top: 1200, display: "flex", gap: 36, alignItems: "center", opacity: endIn,
        transform: `translateY(${interpolate(endIn, [0, 1], [40, 0])}px)` }}>
        <div style={{ position: "relative", width: 260, height: 260, borderRadius: 32, overflow: "hidden", flexShrink: 0, transform: "rotate(-3deg)",
          boxShadow: "0 24px 50px rgba(20,28,43,0.22)" }}>
          <Img src={src(close.image)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        </div>
        <div>
          <div style={{ fontFamily: "DM Sans", fontWeight: 900, fontSize: 50, lineHeight: 1.06, color: INK }}>{close.closing}</div>
          <div style={{ fontFamily: "DM Sans", fontWeight: 700, fontSize: 34, lineHeight: 1.25, color: SOFT, marginTop: 16 }}>
            Send this to <span style={{ color: ACCENT }}>{close.sendTo}</span>.
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const PaperReel: React.FC<Props> = ({ topic, hook, beats, close, timing, hasVoice, voDir = "vo-paper" }) => {
  const tHook = timing?.hook ?? 90;
  const tBeats = timing?.beats ?? beats.map(() => 150);
  const tClose = timing?.close ?? 180;
  const count = beats.length + 2;
  const Vo: React.FC<{ id: string }> = ({ id }) => (hasVoice ? <Audio src={staticFile(`${voDir}/${id}.mp3`)} /> : null);
  return (
    <AbsoluteFill style={{ background: PAPER }}>
      <AbsoluteFill style={{ background: "radial-gradient(120% 70% at 50% 40%, rgba(255,255,255,0.55) 0%, rgba(20,28,43,0.06) 100%)" }} />
      <Series>
        <Series.Sequence durationInFrames={tHook}>
          <Vo id="hook" />
          <Hook headline={hook.headline} image={hook.image} />
          <Chrome topic={topic} count={count} index={0} duration={tHook} />
        </Series.Sequence>
        {beats.map((b, i) => (
          <Series.Sequence key={i} durationInFrames={tBeats[i] ?? 150}>
            <Vo id={`b${i}`} />
            <Beat beat={b} flip={i % 2 === 1} />
            <Chrome topic={topic} count={count} index={i + 1} duration={tBeats[i] ?? 150} />
          </Series.Sequence>
        ))}
        <Series.Sequence durationInFrames={tClose}>
          <Vo id="close" />
          <Close close={close} duration={tClose} />
          <Chrome topic={topic} count={count} index={count - 1} duration={tClose} />
        </Series.Sequence>
      </Series>
    </AbsoluteFill>
  );
};
