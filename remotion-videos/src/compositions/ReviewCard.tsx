import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  staticFile,
  Sequence,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { HookScreen } from "./HookScreen";
import type { VideoCompositionProps } from "./ListCountdown";

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] });

// ReviewCard: screen 0 = HookScreen.
// Remaining screens use the quote card format (large orange quote mark, heading as quote, body below).

interface QuotePanelProps {
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
}

const QuotePanel: React.FC<QuotePanelProps> = ({
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const markOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const quoteOpacity = interpolate(frame, [18, 40], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const quoteY = interpolate(frame, [18, 40], [15, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const attrOpacity = interpolate(frame, [44, 64], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const lineWidth = interpolate(frame, [64, 84], [0, 60], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames - 2], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        backgroundColor: "#0A0A0A",
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 120px",
        opacity: fadeOut,
      }}
    >
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div
        style={{
          fontFamily,
          fontSize: "180px",
          fontWeight: 700,
          color: "#FF6B00",
          lineHeight: 0.8,
          opacity: markOpacity,
          alignSelf: "flex-start",
          marginBottom: "8px",
          userSelect: "none",
        }}
      >
        "
      </div>

      <div
        style={{
          fontFamily,
          fontSize: "48px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          maxWidth: "840px",
          lineHeight: 1.45,
          opacity: quoteOpacity,
          transform: `translateY(${quoteY}px)`,
        }}
      >
        {heading}
      </div>

      {body && (
        <div
          style={{
            fontFamily,
            fontSize: "26px",
            fontWeight: 400,
            color: "#888888",
            textAlign: "center",
            maxWidth: "700px",
            lineHeight: 1.5,
            marginTop: "28px",
            opacity: attrOpacity,
          }}
        >
          {body}
        </div>
      )}

      <div
        style={{
          marginTop: "36px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "12px",
          opacity: attrOpacity,
        }}
      >
        <div
          style={{
            fontFamily,
            fontSize: "20px",
            fontWeight: 400,
            color: "#555555",
            letterSpacing: "0.06em",
          }}
        >
          — Drevon Bullock
        </div>
        <div
          style={{
            height: "3px",
            width: `${lineWidth}px`,
            backgroundColor: "#FF6B00",
            borderRadius: "2px",
          }}
        />
      </div>
    </div>
  );
};

export const ReviewCard: React.FC<VideoCompositionProps> = ({
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
        <Sequence
          from={startFrames[0]}
          durationInFrames={Math.round((screenDurations[0] ?? 2.5) * FPS)}
        >
          <HookScreen
            heading={screens[0].heading}
            screenNumber={screens[0].screen}
            hasAudio={screenHasAudio[0] ?? false}
            durationFrames={Math.round((screenDurations[0] ?? 2.5) * FPS)}
          />
        </Sequence>
      )}

      {screens.slice(1).map((screen, i) => {
        const idx = i + 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);

        return (
          <Sequence key={screen.screen} from={startFrames[idx]} durationInFrames={durationFrames}>
            <QuotePanel
              heading={screen.heading}
              body={screen.body}
              hasAudio={screenHasAudio[idx] ?? false}
              screenNumber={screen.screen}
              durationFrames={durationFrames}
            />
          </Sequence>
        );
      })}
    </>
  );
};
