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

interface StatPanelProps {
  index: number;        // position among teaching screens (0-based)
  totalTeaching: number;
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  isLast: boolean;
}

const StatPanel: React.FC<StatPanelProps> = ({
  index,
  totalTeaching,
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const label = String(index + 1).padStart(2, "0");

  const translateX = interpolate(frame, [0, 22], [100, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = isLast
    ? 1
    : interpolate(frame, [durationFrames - 15, durationFrames - 3], [1, 0], {
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
        padding: "80px",
        opacity: opacity * fadeOut,
        transform: `translateX(${translateX}px)`,
      }}
    >
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div
        style={{
          fontFamily,
          fontSize: "130px",
          fontWeight: 700,
          color: "#FF6B00",
          lineHeight: 1,
          marginBottom: "16px",
        }}
      >
        {label}
      </div>

      <div
        style={{
          fontFamily,
          fontSize: "46px",
          fontWeight: 700,
          color: "white",
          textAlign: "center",
          maxWidth: "800px",
          lineHeight: 1.3,
          marginBottom: "18px",
        }}
      >
        {heading}
      </div>

      {body && (
        <div
          style={{
            fontFamily,
            fontSize: "30px",
            fontWeight: 400,
            color: "#AAAAAA",
            textAlign: "center",
            maxWidth: "760px",
            lineHeight: 1.5,
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
};

export const StatStack: React.FC<VideoCompositionProps> = ({
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

      {teachingScreens.map((screen, i) => {
        const idx = i + 1;
        const isLast = i === teachingScreens.length - 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);

        return (
          <Sequence
            key={screen.screen}
            from={startFrames[idx]}
            durationInFrames={durationFrames}
          >
            <StatPanel
              index={i}
              totalTeaching={teachingScreens.length}
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
