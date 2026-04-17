import React from "react";
import {
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Audio,
  staticFile,
  Sequence,
  Img,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { HookScreen } from "./HookScreen";
import type { VideoCompositionProps } from "./ListCountdown";

const { fontFamily } = loadFont("normal", { weights: ["700", "400"] });

// HookReveal: for single-statement videos.
// Screen 0 = hook. Remaining screens (if any) do a simple word-by-word reveal.
// Used when the whole point fits in one powerful line.

interface WordRevealProps {
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
}

const WordReveal: React.FC<WordRevealProps> = ({
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const words = heading.split(" ").slice(0, 12);
  const lastIdx = words.length - 1;
  const allWordsFrame = lastIdx * 8 + 12;

  const underlineOpacity = interpolate(frame, [allWordsFrame, allWordsFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underlineWidth = interpolate(frame, [allWordsFrame, allWordsFrame + 20], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const bodyOpacity = interpolate(frame, [allWordsFrame + 20, allWordsFrame + 36], [0, 1], {
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
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
        gap: "36px",
        opacity: fadeOut,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile("dre_square_v3.png")}
        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", top: 0, left: 0 }}
      />
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "16px",
          maxWidth: "900px",
        }}
      >
        {words.map((word, i) => {
          const delay = i * 8;
          const opacity = interpolate(frame, [delay, delay + 10], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const ty = interpolate(frame, [delay, delay + 15], [20, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });

          return (
            <div key={i} style={{ position: "relative", display: "inline-block" }}>
              <span
                style={{
                  fontFamily,
                  fontSize: "72px",
                  fontWeight: 700,
                  color: "white",
                  opacity,
                  display: "inline-block",
                  transform: `translateY(${ty}px)`,
                  lineHeight: 1.15,
                }}
              >
                {word}
              </span>
              {i === lastIdx && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "-6px",
                    left: 0,
                    height: "5px",
                    width: `${underlineWidth}%`,
                    backgroundColor: "#00D2FF",
                    opacity: underlineOpacity,
                    borderRadius: "2px",
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {body && (
        <div
          style={{
            fontFamily,
            fontSize: "28px",
            fontWeight: 400,
            color: "#B4C8DA",
            textAlign: "center",
            maxWidth: "780px",
            lineHeight: 1.5,
            opacity: bodyOpacity,
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
};

export const HookReveal: React.FC<VideoCompositionProps> = ({
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
      {/* Screen 0: HookScreen */}
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

      {/* Remaining screens: word-by-word reveal */}
      {screens.slice(1).map((screen, i) => {
        const idx = i + 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);

        return (
          <Sequence key={screen.screen} from={startFrames[idx]} durationInFrames={durationFrames}>
            <WordReveal
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
