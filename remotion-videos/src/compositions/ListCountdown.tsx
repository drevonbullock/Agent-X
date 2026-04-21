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

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] });

export interface Callout {
  emoji: string;
  at: number;
  slot?: "topLeft" | "topRight" | "bottomLeft" | "bottomRight";
}

export interface Visual {
  at: number;
  imageFile: string;
  clipFile?: string;
  side?: "left" | "right";
}

export interface VideoScreen {
  screen: number;
  heading: string;
  body: string;
  points?: [string, string];
  callouts?: Callout[];
  visuals?: Visual[];
}

export interface VideoCompositionProps {
  videoScript: VideoScreen[];
  screenDurations: number[];   // seconds per screen, parallel to videoScript
  screenHasAudio: boolean[];   // whether each screen has audio, parallel to videoScript
  totalDurationSeconds: number;
  bgImage?: string;            // background image filename in /public (defaults to dre_square_v3.png)
}

// ─── COUNTDOWN ITEM ──────────────────────────────────────────────────────────

interface CountdownItemProps {
  number: number;
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  isLast: boolean;
}

const CountdownItem: React.FC<CountdownItemProps> = ({
  number,
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const translateY = interpolate(frame, [0, 20], [40, 0], {
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
        width,
        height,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "80px",
        opacity: opacity * fadeOut,
        transform: `translateY(${translateY}px)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
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
          transform: "scale(2)",
          transformOrigin: "center center",
        }}
      />

      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      {/* Countdown number — cyan accent */}
      <div
        style={{
          fontFamily,
          fontSize: "120px",
          fontWeight: 700,
          color: "#00D2FF",
          lineHeight: 1,
          marginBottom: "20px",
          position: "relative",
        }}
      >
        {number}
      </div>

      {/* Heading — white */}
      <div
        style={{
          fontFamily,
          fontSize: "48px",
          fontWeight: 700,
          color: "#FFFFFF",
          textAlign: "center",
          maxWidth: "860px",
          lineHeight: 1.3,
          marginBottom: "20px",
          position: "relative",
        }}
      >
        {heading}
      </div>

      {/* Body — silver */}
      {body && (
        <div
          style={{
            fontFamily,
            fontSize: "30px",
            fontWeight: 400,
            color: "#FFFFFF",
            textAlign: "center",
            maxWidth: "780px",
            lineHeight: 1.5,
            position: "relative",
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
};

// ─── COMPOSITION ─────────────────────────────────────────────────────────────

export const ListCountdown: React.FC<VideoCompositionProps> = ({
  videoScript,
  screenDurations,
  screenHasAudio,
  totalDurationSeconds,
}) => {
  const screens = videoScript ?? [];
  const FPS = 30;

  // Build cumulative start frames from screenDurations
  const startFrames: number[] = [];
  let cursor = 0;
  for (let i = 0; i < screens.length; i++) {
    startFrames.push(cursor);
    cursor += Math.round((screenDurations[i] ?? 6) * FPS);
  }

  // Teaching screens are everything after the hook (index 0)
  const teachingScreens = screens.slice(1);
  const teachingCount = teachingScreens.length;

  return (
    <>
      {/* Screen 0: Hook */}
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

      {/* Screens 1+: countdown items */}
      {teachingScreens.map((screen, i) => {
        const idx = i + 1; // index in the full screens array
        const countdownNumber = teachingCount - i; // 4, 3, 2, 1
        const isLast = i === teachingScreens.length - 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);

        return (
          <Sequence
            key={screen.screen}
            from={startFrames[idx]}
            durationInFrames={durationFrames}
          >
            <CountdownItem
              number={countdownNumber}
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
