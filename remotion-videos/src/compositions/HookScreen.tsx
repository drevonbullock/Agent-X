import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Audio,
  staticFile,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";

const { fontFamily } = loadFont("normal", { weights: ["700", "400"] });

interface HookScreenProps {
  heading: string;
  screenNumber: number; // used to load the right audio file
  hasAudio: boolean;
  durationFrames: number;
}

// The hook screen shown first in every video.
// Curiosity-gap heading, spring scale animation, orange accent line, subtle glow.
export const HookScreen: React.FC<HookScreenProps> = ({
  heading,
  screenNumber,
  hasAudio,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Spring scale: text eases from 0.9 → 1.0 — subtle, alive, not flashy
  const scale = spring({
    frame,
    fps,
    config: { damping: 200, stiffness: 80, mass: 0.8 },
    from: 0.88,
    to: 1.0,
    durationInFrames: 20,
  });

  // Whole block fades in fast
  const opacity = interpolate(frame, [0, 8], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orange accent line grows from 0 → 60% of screen width over 15 frames, after scale settles
  const lineWidth = interpolate(frame, [18, 33], [0, width * 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out in last 10 frames (avoid hard cut)
  const fadeOut = interpolate(
    frame,
    [durationFrames - 10, durationFrames - 2],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
        opacity: opacity * fadeOut,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {hasAudio && (
        <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />
      )}

      {/* Signature background frame */}
      <Img
        src={staticFile("dre_square_v3.png")}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          top: 0,
          left: 0,
        }}
      />

      {/* Radial cyan glow behind text — 10% opacity, subtle */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(0, 210, 255, 0.10) 0%, transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Heading with spring scale */}
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
          position: "relative",
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: "68px",
            fontWeight: 700,
            color: "white",
            textAlign: "center",
            maxWidth: "880px",
            lineHeight: 1.2,
            letterSpacing: "-0.01em",
          }}
        >
          {heading}
        </div>

        {/* Cyan accent line */}
        <div
          style={{
            height: "5px",
            width: lineWidth,
            backgroundColor: "#00D2FF",
            borderRadius: "3px",
          }}
        />
      </div>
    </div>
  );
};
