import React from "react";
import {
  AbsoluteFill, Img, Sequence, Series, Video,
  interpolate, spring, useCurrentFrame, useVideoConfig, staticFile,
} from "remotion";
import { z } from "zod";

// ─── WICK'S WISDOM REELS ─────────────────────────────────────────────────────
// Dre, 2026-08-29: "if you could use both, either combo that saves money and
// keeps high quality then go for it."
//
// THE ECONOMICS, AND WHY THIS IS BUILT THIS WAY:
// AI video costs ~$0.50 a second and CANNOT render legible text — which is why
// every Wick image prompt bans generated numbers outright. But Wick's content
// IS numbers. So paying per second for a model that cannot show "$12 a day" is
// paying for the wrong capability.
//
// Remotion inverts it. Text and numbers are rendered as real DOM at pixel
// precision, and Wick never gets generated at all: the reel Ken-Burns's stills
// that ALREADY passed the identity gate. Character drift — every "that's a
// different candlestick" rejection — is structurally impossible here, because
// nothing is being invented. Cost per reel: zero.
//
// The optional heroClip is the paid garnish: ONE ~3 second AI shot where real
// motion earns its keep (the scroll-stopping open), on top of an otherwise
// free reel. ~$1.50 instead of ~$8. Omit it and the reel still works.

export const wickReelSchema = z.object({
  hook: z.string(),                 // "YOU ARE LOSING $1,000 A YEAR"
  beats: z.array(z.object({
    title: z.string(),              // "The Fee Nobody Checks"
    problem: z.string(),            // the trap, with its number
    how: z.string(),                // the move to make tonight
    amount: z.number(),             // the dollar figure this beat costs
    image: z.string(),              // approved still (URL or staticFile)
  })),
  total: z.number(),                // what the beats add up to
  closing: z.string(),
  heroClip: z.string().nullable(),  // optional AI clip URL for the open
});
export type WickReelProps = z.infer<typeof wickReelSchema>;

const NAVY = "#0d1830";
const AMBER = "#F5A524";
const CREAM = "#ffe9c4";

const money = (n: number) => "$" + Math.round(n).toLocaleString("en-US");

// ─── KEN BURNS ───────────────────────────────────────────────────────────────
// The only motion the stills get: a slow push and drift. Deliberately gentle —
// the character must never look like he is being yanked around, and a subtle
// move reads as production value while a fast one reads as a slideshow effect.
// Accepts either a bare filename in /public (staticFile) or a full URL, because
// props come from two places: the local stager and live Supabase slide URLs.
const resolve = (s: string) => (/^https?:\/\//.test(s) ? s : staticFile(s));

const KenBurns: React.FC<{ src: string; seed?: number }> = ({ src, seed = 0 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const dir = seed % 2 === 0 ? 1 : -1;
  const scale = interpolate(frame, [0, durationInFrames], [1.06, 1.18], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  const x = interpolate(frame, [0, durationInFrames], [0, 26 * dir], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <AbsoluteFill style={{ overflow: "hidden", background: NAVY }}>
      <Img
        src={resolve(src)}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${scale}) translateX(${x}px)`,
        }}
      />
      {/* Floor the type sits on. Without it, light art eats white text. */}
      <AbsoluteFill style={{
        background:
          "linear-gradient(180deg, rgba(8,12,24,.72) 0%, rgba(8,12,24,.30) 32%, rgba(8,12,24,.86) 72%, rgba(8,12,24,.96) 100%)",
      }} />
    </AbsoluteFill>
  );
};

// ─── COUNTING NUMBER ─────────────────────────────────────────────────────────
// The one piece of motion AI video genuinely cannot do: a figure that climbs.
// It is also the single most watchable thing in a money reel, so it carries
// the beats and the payoff.
const CountUp: React.FC<{ to: number; delay?: number; style?: React.CSSProperties }> =
({ to, delay = 0, style }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = spring({ frame: frame - delay, fps, config: { damping: 200, mass: 0.6 } });
  return <span style={style}>{money(p * to)}</span>;
};

// ─── HOOK ────────────────────────────────────────────────────────────────────
const Hook: React.FC<{ text: string; heroClip: string | null }> = ({ text, heroClip }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const rise = spring({ frame, fps, config: { damping: 200 } });
  const out = interpolate(frame, [durationInFrames - 8, durationInFrames], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Every money figure lights amber — the hook's number IS the hook.
  const parts = text.toUpperCase().split(/(\$[\d,]+)/g);

  return (
    <AbsoluteFill style={{ background: NAVY }}>
      {heroClip
        ? <Video src={heroClip} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted />
        : <KenBurns src="hook.jpg" />}
      <AbsoluteFill style={{
        background: "linear-gradient(180deg, rgba(8,12,24,.55), rgba(8,12,24,.92))",
      }} />
      <AbsoluteFill style={{
        justifyContent: "center", alignItems: "center", padding: "0 90px",
        opacity: out,
      }}>
        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 132, lineHeight: 1.02,
          color: "#fff", textAlign: "center", textTransform: "uppercase",
          transform: `translateY(${(1 - rise) * 40}px)`, opacity: rise,
          textShadow: "0 8px 40px rgba(0,0,0,.9)",
        }}>
          {parts.map((p, i) => (
            <span key={i} style={{ color: /^\$/.test(p) ? AMBER : "#fff" }}>{p}</span>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── BEAT: PROBLEM → HOW ─────────────────────────────────────────────────────
const Beat: React.FC<WickReelProps["beats"][number] & { index: number }> =
({ title, problem, how, amount, image, index }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const inSpring = spring({ frame, fps, config: { damping: 200 } });
  const howIn = spring({ frame: frame - 34, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill>
      {image ? <KenBurns src={image} seed={index} /> : <AbsoluteFill style={{ background: NAVY }} />}
      <AbsoluteFill style={{ padding: "0 78px", justifyContent: "flex-end", paddingBottom: 260 }}>
        {/* the number lands first and biggest — it is the reason to keep watching */}
        <div style={{
          fontFamily: "Anton, Impact, sans-serif", fontSize: 160, color: AMBER,
          lineHeight: 1, opacity: inSpring, transform: `translateY(${(1 - inSpring) * 30}px)`,
          textShadow: "0 6px 30px rgba(0,0,0,.85)",
        }}>
          <CountUp to={amount} delay={4} />
        </div>
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 62,
          color: "#fff", marginTop: 14, opacity: inSpring, textShadow: "0 4px 20px rgba(0,0,0,.9)",
        }}>{title}</div>
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 46, lineHeight: 1.25,
          color: CREAM, marginTop: 16, opacity: inSpring, textShadow: "0 4px 18px rgba(0,0,0,.9)",
        }}>{problem}</div>
        {/* the HOW beat, amber and arrowed, exactly as on the carousels */}
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 800, fontSize: 46,
          color: AMBER, marginTop: 24, opacity: howIn,
          transform: `translateX(${(1 - howIn) * -26}px)`, textShadow: "0 4px 18px rgba(0,0,0,.9)",
        }}>→ {how}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── PAYOFF ──────────────────────────────────────────────────────────────────
// The beats stack into the total. This is the moment the reel earns its hook,
// so the arithmetic is shown, not asserted.
const Payoff: React.FC<{ total: number; closing: string; beats: WickReelProps["beats"] }> =
({ total, closing, beats }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const closeIn = spring({ frame: frame - 58, fps, config: { damping: 200 } });

  return (
    <AbsoluteFill style={{ background: NAVY }}>
      <KenBurns src="close.jpg" seed={3} />
      <AbsoluteFill style={{ justifyContent: "center", padding: "0 84px" }}>
        {beats.map((b, i) => {
          const d = i * 9;
          const o = interpolate(frame, [d, d + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
          return (
            <div key={i} style={{
              display: "flex", justifyContent: "space-between", alignItems: "baseline",
              fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 44, color: CREAM,
              opacity: o, marginBottom: 12, textShadow: "0 3px 14px rgba(0,0,0,.9)",
            }}>
              <span>{b.title}</span>
              <span style={{ color: "#fff", fontWeight: 700 }}>{money(b.amount)}</span>
            </div>
          );
        })}
        <div style={{ height: 4, background: AMBER, margin: "22px 0", opacity: closeIn }} />
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontFamily: "Anton, Impact, sans-serif", fontSize: 108, color: AMBER, opacity: closeIn,
          textShadow: "0 6px 28px rgba(0,0,0,.85)",
        }}>
          <span style={{ fontSize: 54, color: "#fff" }}>A YEAR</span>
          <CountUp to={total} delay={58} />
        </div>
        <div style={{
          fontFamily: "'DM Sans', system-ui, sans-serif", fontWeight: 700, fontSize: 48,
          color: "#fff", marginTop: 40, opacity: closeIn, textShadow: "0 4px 18px rgba(0,0,0,.9)",
        }}>{closing}</div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

// ─── THE REEL ────────────────────────────────────────────────────────────────
export const WickReel: React.FC<WickReelProps> = ({ hook, beats, total, closing, heroClip }) => (
  <AbsoluteFill style={{ background: NAVY }}>
    <Series>
      <Series.Sequence durationInFrames={90}>
        <Hook text={hook} heroClip={heroClip} />
      </Series.Sequence>
      {beats.map((b, i) => (
        <Series.Sequence key={i} durationInFrames={105}>
          <Beat {...b} index={i} />
        </Series.Sequence>
      ))}
      <Series.Sequence durationInFrames={150}>
        <Payoff total={total} closing={closing} beats={beats} />
      </Series.Sequence>
    </Series>
    {/* watermark, every frame */}
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 54 }}>
      <div style={{
        fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 26, letterSpacing: 6,
        color: "rgba(255,233,196,.55)",
      }}>@WICKSWISDOM</div>
    </AbsoluteFill>
  </AbsoluteFill>
);
