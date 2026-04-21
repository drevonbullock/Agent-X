import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { VideoCompositionProps, Callout } from "./ListCountdown";

const { fontFamily } = loadFont("normal", { weights: ["400", "700", "800"] });

const CYAN   = "#00D2FF";
const ORANGE = "#e05d38";
const BG1    = "#0b1422";
const BG2    = "#121e38";
const WHITE  = "#ffffff";
const MUTED  = "#B4C8DA";
const DIM    = "#6b88a8";

// ── Animated dark background with glows ───────────────────────────────────────
const AnimBG: React.FC = () => {
  const frame = useCurrentFrame();
  const pulse = 0.5 + 0.5 * Math.sin((frame / 90) * Math.PI);

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden",
      background: `linear-gradient(150deg, ${BG1} 0%, ${BG2} 55%, #080f1c 100%)` }}>

      {/* Cyan glow blob — top-right, slowly breathes */}
      <div style={{
        position: "absolute", top: -160, right: -120,
        width: 800, height: 800, borderRadius: "50%",
        background: `radial-gradient(circle, rgba(0,210,255,${0.06 + pulse * 0.04}) 0%, transparent 65%)`,
      }} />

      {/* Orange glow blob — bottom-left */}
      <div style={{
        position: "absolute", bottom: -120, left: -80,
        width: 600, height: 600, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(224,93,56,0.07) 0%, transparent 65%)",
      }} />

      {/* Subtle horizontal grid line — upper third */}
      <div style={{
        position: "absolute", top: "38%", left: 0, right: 0, height: 1,
        background: "linear-gradient(to right, transparent 0%, rgba(0,210,255,0.07) 30%, rgba(0,210,255,0.07) 70%, transparent 100%)",
      }} />

      {/* Subtle vertical accent — left edge */}
      <div style={{
        position: "absolute", top: "15%", bottom: "15%", left: 42, width: 2,
        background: `linear-gradient(to bottom, transparent, rgba(0,210,255,0.18) 30%, rgba(0,210,255,0.18) 70%, transparent)`,
        borderRadius: 2,
      }} />

      {/* Floating dot — top left quadrant, drifts slowly */}
      <div style={{
        position: "absolute",
        top: 280 + Math.sin(frame / 120) * 18,
        left: 80 + Math.cos(frame / 150) * 12,
        width: 10, height: 10, borderRadius: "50%",
        backgroundColor: CYAN,
        opacity: 0.25,
        boxShadow: `0 0 16px ${CYAN}`,
      }} />

      {/* Floating dot — lower right, opposite phase */}
      <div style={{
        position: "absolute",
        bottom: 380 + Math.cos(frame / 100) * 14,
        right: 90 + Math.sin(frame / 130) * 10,
        width: 7, height: 7, borderRadius: "50%",
        backgroundColor: ORANGE,
        opacity: 0.30,
        boxShadow: `0 0 12px ${ORANGE}`,
      }} />
    </div>
  );
};

// ── Cyan progress bar along the bottom ────────────────────────────────────────
const ProgressBar: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const pct = interpolate(frame, [0, durationFrames - 8], [0, 100], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 4,
      background: "rgba(255,255,255,0.05)", zIndex: 10 }}>
      <div style={{
        height: "100%", width: `${pct}%`,
        background: `linear-gradient(to right, ${CYAN}, ${ORANGE})`,
        borderRadius: "0 2px 2px 0",
        boxShadow: `0 0 10px rgba(0,210,255,0.6)`,
      }} />
    </div>
  );
};

// ── Screen counter badge (top-left) ───────────────────────────────────────────
const ScreenBadge: React.FC<{ n: number }> = ({ n }) => {
  const frame = useCurrentFrame();
  const op = interpolate(frame, [0, 14], [0, 0.55], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });
  return (
    <div style={{
      position: "absolute", top: 76, left: 60, zIndex: 10,
      fontFamily, fontSize: 15, fontWeight: 700, color: DIM,
      letterSpacing: "0.3em", opacity: op,
    }}>
      {String(n).padStart(2, "0")}
    </div>
  );
};

// ── Callout bubble ─────────────────────────────────────────────────────────────
const SLOTS: Record<NonNullable<Callout["slot"]>, React.CSSProperties> = {
  topLeft:     { top: 200,  left:  55 },
  topRight:    { top: 200,  right: 55 },
  bottomLeft:  { bottom: 320, left: 55 },
  bottomRight: { bottom: 320, right: 55 },
};

const CalloutBubble: React.FC<{ c: Callout; fps: number }> = ({ c, fps }) => {
  const frame = useCurrentFrame();
  const startF = Math.round(c.at * fps);
  const holdF  = Math.round(3.5 * fps);
  const fadeF  = Math.round(0.7 * fps);
  const endF   = startF + holdF + fadeF;

  if (frame < startF || frame > endF) return null;
  const elapsed = frame - startF;

  const sp = spring({ frame: elapsed, fps, config: { damping: 7, stiffness: 220, mass: 0.5 } });
  const scale = interpolate(sp, [0, 1], [0.15, 1.12]);
  const rot   = interpolate(
    spring({ frame: elapsed, fps, config: { damping: 5, stiffness: 300, mass: 0.4 } }),
    [0, 1], [-18, 0]
  );
  const op = interpolate(frame, [startF + holdF, endF], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute", ...SLOTS[c.slot ?? "topRight"],
      zIndex: 20, opacity: op, fontSize: 90, lineHeight: 1,
      transform: `scale(${scale}) rotate(${rot}deg)`,
      transformOrigin: "center bottom",
      filter: "drop-shadow(0 8px 20px rgba(0,0,0,0.65))",
    }}>
      {c.emoji}
    </div>
  );
};

// ── HOOK SCREEN ───────────────────────────────────────────────────────────────
const HookSlide: React.FC<{
  heading: string;
  screenNumber: number;
  hasAudio: boolean;
  durationFrames: number;
}> = ({ heading, screenNumber, hasAudio, durationFrames }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flash   = interpolate(frame, [0, 5], [0.65, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const scaleSp = spring({ frame, fps, config: { damping: 200, stiffness: 80, mass: 0.8 }, from: 0.86, to: 1.0, durationInFrames: 24 });
  const eyebrowOp = interpolate(frame, [10, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineW = interpolate(frame, [22, 42], [0, 180], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", padding: "80px 70px",
      opacity: fadeIn * fadeOut }}>
      <AnimBG />
      {flash > 0 && <div style={{ position: "absolute", inset: 0, backgroundColor: WHITE, opacity: flash, zIndex: 25 }} />}
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column",
        alignItems: "center", gap: 36, transform: `scale(${scaleSp})` }}>
        {/* Eyebrow */}
        <div style={{ fontFamily, fontSize: 16, fontWeight: 700, color: DIM,
          letterSpacing: "0.4em", textTransform: "uppercase", opacity: eyebrowOp }}>
          DRE'VON BULLOCK
        </div>

        {/* Headline */}
        <div style={{ fontFamily, fontSize: 78, fontWeight: 800, color: WHITE,
          textAlign: "center", lineHeight: 1.14, letterSpacing: "-0.02em", maxWidth: 920 }}>
          {heading}
        </div>

        {/* Glowing accent line */}
        <div style={{
          height: 5, width: lineW, borderRadius: 3,
          background: `linear-gradient(to right, ${CYAN}, rgba(0,210,255,0.25))`,
          boxShadow: `0 0 22px rgba(0,210,255,0.85)`,
        }} />
      </div>

      <ProgressBar durationFrames={durationFrames} />
    </div>
  );
};

// ── CONTENT SCREEN ────────────────────────────────────────────────────────────
const ContentSlide: React.FC<{
  heading: string;
  body: string;
  screenNumber: number;
  hasAudio: boolean;
  durationFrames: number;
  callouts: Callout[];
}> = ({ heading, body, screenNumber, hasAudio, durationFrames, callouts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn  = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const flash   = interpolate(frame, [0, 5], [0.5, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Heading springs up from below
  const hSp    = spring({ frame, fps, config: { damping: 12, stiffness: 200, mass: 0.8 } });
  const hTy    = interpolate(hSp, [0, 1], [52, 0]);
  const hOp    = Math.min(1, hSp);
  const hScale = interpolate(hSp, [0, 1], [0.86, 1.0]);

  // Divider draws left→right starting at frame 14
  const divW   = interpolate(frame, [16, 36], [0, 240], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const divOp  = interpolate(frame, [16, 26], [0, 1],   { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Body fades + rises after divider
  const bOp    = interpolate(frame, [28, 44], [0, 1],  { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bTy    = interpolate(frame, [28, 44], [18, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column",
      alignItems: "flex-start", justifyContent: "center", padding: "100px 70px 80px",
      opacity: fadeIn * fadeOut }}>
      <AnimBG />
      {flash > 0 && <div style={{ position: "absolute", inset: 0, backgroundColor: WHITE, opacity: flash, zIndex: 25 }} />}
      <ScreenBadge n={screenNumber} />
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div style={{ position: "relative", zIndex: 5, display: "flex", flexDirection: "column", gap: 38, maxWidth: 960 }}>
        {/* Heading */}
        <div style={{
          fontFamily, fontSize: 66, fontWeight: 800, color: WHITE,
          lineHeight: 1.2, letterSpacing: "-0.02em",
          opacity: hOp, transform: `translateY(${hTy}px) scale(${hScale})`,
        }}>
          {heading}
        </div>

        {/* Cyan dot + divider line */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, opacity: divOp }}>
          <div style={{
            width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
            backgroundColor: CYAN, boxShadow: `0 0 12px ${CYAN}`,
          }} />
          <div style={{
            width: divW, height: 3, borderRadius: 2,
            background: `linear-gradient(to right, ${CYAN}, rgba(0,210,255,0.15))`,
            boxShadow: `0 0 14px rgba(0,210,255,0.5)`,
          }} />
        </div>

        {/* Body */}
        {body && (
          <div style={{
            fontFamily, fontSize: 33, fontWeight: 400, color: MUTED,
            lineHeight: 1.62, opacity: bOp, transform: `translateY(${bTy}px)`,
          }}>
            {body}
          </div>
        )}
      </div>

      {callouts.map((c, i) => <CalloutBubble key={i} c={c} fps={fps} />)}
      <ProgressBar durationFrames={durationFrames} />
    </div>
  );
};

// ── Root composition ──────────────────────────────────────────────────────────
export const ExplainerVertical: React.FC<VideoCompositionProps> = ({
  videoScript,
  screenDurations,
  screenHasAudio,
}) => {
  const screens = videoScript ?? [];
  const FPS = 30;

  const startFrames: number[] = [];
  let cursor = 0;
  for (let i = 0; i < screens.length; i++) {
    startFrames.push(cursor);
    cursor += Math.round((screenDurations[i] ?? 6) * FPS);
  }

  return (
    <>
      {screens[0] && (
        <Sequence from={startFrames[0]} durationInFrames={Math.round((screenDurations[0] ?? 3) * FPS)}>
          <HookSlide
            heading={screens[0].heading}
            screenNumber={screens[0].screen}
            hasAudio={screenHasAudio[0] ?? false}
            durationFrames={Math.round((screenDurations[0] ?? 3) * FPS)}
          />
        </Sequence>
      )}

      {screens.slice(1).map((screen, i) => {
        const idx = i + 1;
        const dur = Math.round((screenDurations[idx] ?? 6) * FPS);
        return (
          <Sequence key={screen.screen} from={startFrames[idx]} durationInFrames={dur}>
            <ContentSlide
              heading={screen.heading}
              body={screen.body}
              screenNumber={screen.screen}
              hasAudio={screenHasAudio[idx] ?? false}
              durationFrames={dur}
              callouts={screen.callouts ?? []}
            />
          </Sequence>
        );
      })}
    </>
  );
};
