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
  bgImage?: string;
  topAligned?: boolean; // vertical reels: anchor heading near top safe zone
}

// The hook screen shown first in every video.
// Curiosity-gap heading, spring scale animation, orange accent line, subtle glow.
export const HookScreen: React.FC<HookScreenProps> = ({
  heading,
  screenNumber,
  hasAudio,
  durationFrames,
  bgImage = "dre_square_v3.png",
  topAligned = false,
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

  // Fade in: 0.3s (9 frames)
  const opacity = interpolate(frame, [0, 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Orange accent line grows from 0 → 60% of screen width over 15 frames, after scale settles
  const lineWidth = interpolate(frame, [18, 33], [0, width * 0.6], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fade out: 0.4s (12 frames)
  const fadeOut = interpolate(
    frame,
    [durationFrames - 12, durationFrames],
    [1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  // Ken Burns: visible 20% zoom over hook screen duration
  const bgScale = interpolate(frame, [0, durationFrames], [1.0, 1.20], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Screen flash: white bloom for first 4 frames
  const flash = interpolate(frame, [0, 4], [0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: topAligned ? "flex-start" : "center",
        padding: "80px",
        paddingTop: topAligned ? "300px" : "80px",
        opacity: opacity * fadeOut,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {hasAudio && (
        <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />
      )}

      {/* Background with Ken Burns zoom */}
      <Img
        src={staticFile(bgImage)}
        style={{
          position: "absolute",
          width: "100%",
          height: "100%",
          objectFit: "cover",
          top: 0,
          left: 0,
          transform: `scale(${bgScale})`,
          transformOrigin: "center center",
        }}
      />

      {/* Bottom vignette */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: "45%",
          background:
            "linear-gradient(to top, rgba(28,36,51,0.92) 0%, rgba(28,36,51,0.35) 55%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Top vignette */}
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: "20%",
          background:
            "linear-gradient(to bottom, rgba(28,36,51,0.65) 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Radial cyan glow behind text */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle at 50% 50%, rgba(0, 210, 255, 0.12) 0%, transparent 65%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Screen flash */}
      {flash > 0 && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(255,255,255,1)",
            opacity: flash,
            pointerEvents: "none",
            zIndex: 15,
          }}
        />
      )}

      {/* Heading with spring scale */}
      <div
        style={{
          transform: `scale(${scale})`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "28px",
          position: "relative",
          zIndex: 2,
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
            textTransform: topAligned ? "uppercase" : "none",
          }}
        >
          {heading}
        </div>

        {/* Cyan accent line with glow */}
        <div
          style={{
            height: "5px",
            width: lineWidth,
            backgroundColor: "#00D2FF",
            borderRadius: "3px",
            boxShadow: "0 0 16px rgba(0, 210, 255, 0.9)",
          }}
        />
      </div>
    </div>
  );
};
