import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
  Sequence,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import type { VideoCompositionProps } from "./ListCountdown";

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] });

// ─── BREAKING NEWS SCREEN ─────────────────────────────────────────────────────
// Screen 0: Full-width hook — "BREAKING" label + bold headline.
// Screens 1+: Context + angle + CTA panels (horizontal 16:9 layout).

interface BreakingHookProps {
  heading: string;
  screenNumber: number;
  hasAudio: boolean;
  durationFrames: number;
}

const BreakingHook: React.FC<BreakingHookProps> = ({
  heading,
  screenNumber,
  hasAudio,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const labelOpacity = interpolate(frame, [0, 10], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const scale = spring({ frame, fps, config: { damping: 180, stiffness: 60, mass: 0.9 }, from: 0.92, to: 1, durationInFrames: 25 });
  const textOpacity = interpolate(frame, [6, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [20, 38], [0, width * 0.5], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", opacity: fadeOut }}>
      <Img
        src={staticFile("dre_horizontal_v3.png")}
        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", top: 0, left: 0 }}
      />
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      {/* Cyan radial glow */}
      <div style={{
        position: "absolute", inset: 0,
        backgroundImage: "radial-gradient(ellipse at 50% 60%, rgba(0,210,255,0.12) 0%, transparent 60%)",
        pointerEvents: "none",
      }} />

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px",
        gap: "28px",
      }}>
        {/* BREAKING label */}
        <div style={{
          fontFamily,
          fontSize: "22px",
          fontWeight: 700,
          color: "#00D2FF",
          letterSpacing: "0.28em",
          textTransform: "uppercase" as const,
          opacity: labelOpacity,
          border: "2px solid #00D2FF",
          padding: "6px 22px",
          borderRadius: "4px",
        }}>
          Breaking
        </div>

        {/* Headline */}
        <div style={{
          fontFamily,
          fontSize: "64px",
          fontWeight: 700,
          color: "#FFFFFF",
          textAlign: "center",
          maxWidth: "1400px",
          lineHeight: 1.2,
          transform: `scale(${scale})`,
          opacity: textOpacity,
        }}>
          {heading}
        </div>

        {/* Cyan accent line */}
        <div style={{ height: "4px", width: lineWidth, backgroundColor: "#00D2FF", borderRadius: "3px" }} />
      </div>
    </div>
  );
};

// ─── CONTEXT PANEL ────────────────────────────────────────────────────────────
// Screens 1+: slide-in context panels with label, heading, body.

interface ContextPanelProps {
  label: string;
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  isLast: boolean;
}

const PANEL_LABELS = ["The Story", "What It Means", "My Take", "The Angle", "Bottom Line"];

const ContextPanel: React.FC<ContextPanelProps> = ({
  label,
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const translateX = interpolate(frame, [0, 22], [80, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = isLast ? 1 : interpolate(frame, [durationFrames - 15, durationFrames - 3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      width, height,
      position: "relative",
      overflow: "hidden",
      opacity: opacity * fadeOut,
      transform: `translateX(${translateX}px)`,
    }}>
      <Img
        src={staticFile("dre_horizontal_v3.png")}
        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", top: 0, left: 0 }}
      />
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "flex-start", justifyContent: "center",
        padding: "80px 120px",
        gap: "24px",
      }}>
        <div style={{
          fontFamily, fontSize: "18px", fontWeight: 700,
          color: "#00D2FF", letterSpacing: "0.22em",
          textTransform: "uppercase" as const,
          position: "relative",
        }}>
          {label}
        </div>

        <div style={{
          fontFamily, fontSize: "52px", fontWeight: 700,
          color: "#FFFFFF", maxWidth: "1200px",
          lineHeight: 1.25, position: "relative",
        }}>
          {heading}
        </div>

        {body && (
          <div style={{
            fontFamily, fontSize: "30px", fontWeight: 400,
            color: "#B4C8DA", maxWidth: "1100px",
            lineHeight: 1.5, position: "relative",
          }}>
            {body}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── COMPOSITION ─────────────────────────────────────────────────────────────

export const NewsReactive: React.FC<VideoCompositionProps> = ({
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

  const teachingScreens = screens.slice(1);

  return (
    <>
      {screens[0] && (
        <Sequence from={startFrames[0]} durationInFrames={Math.round((screenDurations[0] ?? 3) * FPS)}>
          <BreakingHook
            heading={screens[0].heading}
            screenNumber={screens[0].screen}
            hasAudio={screenHasAudio[0] ?? false}
            durationFrames={Math.round((screenDurations[0] ?? 3) * FPS)}
          />
        </Sequence>
      )}

      {teachingScreens.map((screen, i) => {
        const idx = i + 1;
        const isLast = i === teachingScreens.length - 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);
        const label = PANEL_LABELS[i] ?? `Point ${i + 1}`;

        return (
          <Sequence key={screen.screen} from={startFrames[idx]} durationInFrames={durationFrames}>
            <ContextPanel
              label={label}
              heading={screen.heading}
              body={screen.body}
              hasAudio={screenHasAudio[idx] ?? false}
              screenNumber={screen.screen}
              durationFrames={durationFrames}
              isLast={isLast}
            />
          </Sequence>
        );
      })}
    </>
  );
};
