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

const { fontFamily } = loadFont("normal", { weights: ["400", "700"] });

interface PanelProps {
  heading: string;
  body: string;
  accentColor: string;
  label: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  isLast: boolean;
}

const Panel: React.FC<PanelProps> = ({
  heading,
  body,
  accentColor,
  label,
  hasAudio,
  screenNumber,
  durationFrames,
  isLast,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

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
        position: "absolute",
        inset: 0,
        overflow: "hidden",
      }}
    >
      <Img
        src={staticFile("dre_square_v3.png")}
        style={{ position: "absolute", width: "100%", height: "100%", objectFit: "cover", top: 0, left: 0 }}
      />
      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      {/* Tint overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundColor: accentColor,
          opacity: 0.1,
          pointerEvents: "none",
        }}
      />

      <div
        style={{
          fontFamily,
          fontSize: "20px",
          fontWeight: 700,
          color: accentColor,
          letterSpacing: "0.18em",
          textTransform: "uppercase" as const,
          marginBottom: "28px",
          position: "relative",
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
          maxWidth: "860px",
          lineHeight: 1.35,
          marginBottom: "22px",
          position: "relative",
        }}
      >
        {heading}
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
            position: "relative",
          }}
        >
          {body}
        </div>
      )}
    </div>
  );
};

// Orange wipe bar sweeps left → right
const Wipe: React.FC<{ durationFrames: number }> = ({ durationFrames }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();

  const wipeX = interpolate(frame, [0, durationFrames], [-width, width], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: wipeX,
        width,
        height,
        backgroundColor: "#00D2FF",
        zIndex: 20,
        pointerEvents: "none",
      }}
    />
  );
};

const WIPE_FRAMES = 24; // 0.8s wipe

export const ProblemSolution: React.FC<VideoCompositionProps> = ({
  videoScript,
  screenDurations,
  screenHasAudio,
}) => {
  const screens = videoScript ?? [];
  const FPS = 30;

  // Screen 0 = hook, screens 1+ = teaching
  const teachingScreens = screens.slice(1);
  const splitAt = Math.ceil(teachingScreens.length / 2);
  const problemScreens = teachingScreens.slice(0, splitAt);
  const solutionScreens = teachingScreens.slice(splitAt).length > 0
    ? teachingScreens.slice(splitAt)
    : teachingScreens.slice(splitAt - 1);

  // Build start frames for ALL screens (hook + teaching)
  const startFrames: number[] = [];
  let cursor = 0;
  for (let i = 0; i < screens.length; i++) {
    startFrames.push(cursor);
    cursor += Math.round((screenDurations[i] ?? 6) * FPS);
  }

  // Wipe starts right after problem screens end (after hook + problem screens)
  const hookFrames = Math.round((screenDurations[0] ?? 2.5) * FPS);
  const problemTotalFrames = problemScreens.reduce((sum, _, i) => {
    const idx = i + 1; // +1 for hook offset
    return sum + Math.round((screenDurations[idx] ?? 6) * FPS);
  }, 0);
  const wipeStart = hookFrames + problemTotalFrames;

  // Solution screens start after wipe
  const solutionStartCursor = wipeStart + WIPE_FRAMES;

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>

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

      {/* Problem screens */}
      {problemScreens.map((screen, i) => {
        const idx = i + 1;
        const isLastProblem = i === problemScreens.length - 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);

        return (
          <Sequence
            key={`problem-${screen.screen}`}
            from={startFrames[idx]}
            durationInFrames={durationFrames}
          >
            <Panel
              heading={screen.heading}
              body={screen.body}
              accentColor="#FF3B3B"
              label="The Problem"
              hasAudio={screenHasAudio[idx] ?? false}
              screenNumber={screen.screen}
              durationFrames={durationFrames}
              isLast={false}
            />
          </Sequence>
        );
      })}

      {/* Wipe transition */}
      <Sequence from={wipeStart} durationInFrames={WIPE_FRAMES}>
        <Wipe durationFrames={WIPE_FRAMES} />
      </Sequence>

      {/* Solution screens */}
      {solutionScreens.map((screen, i) => {
        const idx = problemScreens.length + 1 + i; // offset for hook + problem screens
        const isLast = i === solutionScreens.length - 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 6) * FPS);
        const from = solutionStartCursor + i * durationFrames;

        return (
          <Sequence
            key={`solution-${screen.screen}`}
            from={from}
            durationInFrames={durationFrames}
          >
            <Panel
              heading={screen.heading}
              body={screen.body}
              accentColor="#FF6B00"
              label="The Fix"
              hasAudio={screenHasAudio[idx] ?? false}
              screenNumber={screen.screen}
              durationFrames={durationFrames}
              isLast={isLast}
            />
          </Sequence>
        );
      })}
    </div>
  );
};
