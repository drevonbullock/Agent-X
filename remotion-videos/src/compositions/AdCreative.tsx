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

// ─── AD CREATIVE COMPOSITION ──────────────────────────────────────────────────
// Module 7 video output — horizontal 16:9 format.
// Screen 0: headline hook + "AD CREATIVE" label.
// Screens 1+: variation reveals — each shows a new headline/description pair.

interface AdHeaderProps {
  heading: string;
  screenNumber: number;
  hasAudio: boolean;
  durationFrames: number;
}

const AdHeader: React.FC<AdHeaderProps> = ({ heading, screenNumber, hasAudio, durationFrames }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const scale = spring({ frame, fps, config: { damping: 180, stiffness: 60 }, from: 0.9, to: 1, durationInFrames: 22 });
  const opacity = interpolate(frame, [0, 12], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [22, 40], [0, width * 0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{ width, height, position: "relative", overflow: "hidden", opacity: fadeOut }}>
      <Img
        src={staticFile("dre_horizontal_v3.png")}
        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", top: 0, left: 0 }}
      />
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center",
        padding: "80px", gap: "28px",
        opacity,
      }}>
        <div style={{
          fontFamily, fontSize: "20px", fontWeight: 700,
          color: "#00D2FF", letterSpacing: "0.30em",
          textTransform: "uppercase" as const,
          border: "1px solid rgba(0,210,255,0.5)",
          padding: "6px 20px", borderRadius: "4px",
        }}>
          Ad Creative
        </div>

        <div style={{
          fontFamily, fontSize: "60px", fontWeight: 700,
          color: "#FFFFFF", textAlign: "center",
          maxWidth: "1300px", lineHeight: 1.2,
          transform: `scale(${scale})`,
        }}>
          {heading}
        </div>

        <div style={{ height: "4px", width: lineWidth, backgroundColor: "#00D2FF", borderRadius: "3px" }} />
      </div>
    </div>
  );
};

// ─── VARIATION PANEL ──────────────────────────────────────────────────────────
// Each teaching screen reveals one copy variation with its label.

interface VariationPanelProps {
  variationNum: number;
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  isLast: boolean;
}

const VariationPanel: React.FC<VariationPanelProps> = ({
  variationNum,
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const translateY = interpolate(frame, [0, 20], [50, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const opacity = interpolate(frame, [0, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fadeOut = isLast ? 1 : interpolate(frame, [durationFrames - 15, durationFrames - 3], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <div style={{
      width, height,
      position: "relative",
      overflow: "hidden",
      opacity: opacity * fadeOut,
      transform: `translateY(${translateY}px)`,
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
        padding: "60px 120px", gap: "20px",
      }}>
        {/* Variation badge */}
        <div style={{
          fontFamily, fontSize: "16px", fontWeight: 700,
          color: "#00D2FF", letterSpacing: "0.20em",
          textTransform: "uppercase" as const,
          backgroundColor: "rgba(0,210,255,0.12)",
          border: "1px solid rgba(0,210,255,0.4)",
          padding: "4px 16px", borderRadius: "4px",
          position: "relative",
        }}>
          Variation {variationNum}
        </div>

        {/* New headline */}
        <div style={{
          fontFamily, fontSize: "54px", fontWeight: 700,
          color: "#FFFFFF", maxWidth: "1300px",
          lineHeight: 1.2, position: "relative",
        }}>
          {heading}
        </div>

        {/* Body / description */}
        {body && (
          <div style={{
            fontFamily, fontSize: "28px", fontWeight: 400,
            color: "#B4C8DA", maxWidth: "1200px",
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

export const AdCreative: React.FC<VideoCompositionProps> = ({
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
          <AdHeader
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

        return (
          <Sequence key={screen.screen} from={startFrames[idx]} durationInFrames={durationFrames}>
            <VariationPanel
              variationNum={i + 1}
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
