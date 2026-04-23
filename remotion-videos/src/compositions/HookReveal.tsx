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
  Video,
} from "remotion";
import { loadFont } from "@remotion/google-fonts/Inter";
import { HookScreen } from "./HookScreen";
import type { VideoCompositionProps, Callout, Visual } from "./ListCountdown";

const { fontFamily } = loadFont("normal", { weights: ["700", "400"] });

// ── Floating callout bubble ────────────────────────────────────────────────────
const SLOT_POSITIONS: Record<NonNullable<Callout["slot"]>, React.CSSProperties> = {
  topLeft:     { top: 220,  left:  60 },
  topRight:    { top: 220,  right: 60 },
  bottomLeft:  { bottom: 340, left: 60 },
  bottomRight: { bottom: 340, right: 60 },
};

const CalloutBubble: React.FC<{ callout: Callout; fps: number; screenDurationFrames: number }> = ({
  callout,
  fps,
  screenDurationFrames,
}) => {
  const frame = useCurrentFrame();
  const startFrame = Math.round(callout.at * fps);
  const holdFrames = Math.round(3.5 * fps);
  const fadeFrames = Math.round(0.6 * fps);
  const endFrame = startFrame + holdFrames + fadeFrames;

  if (frame < startFrame || frame > endFrame) return null;

  const elapsed = frame - startFrame;

  // Spring bounce: overshoots then settles
  const sp = spring({
    frame: elapsed,
    fps,
    config: { damping: 7, stiffness: 220, mass: 0.5 },
  });
  const scale = interpolate(sp, [0, 1], [0.2, 1.18]);
  const finalScale = Math.min(scale, 1.18);

  // Wiggle: slight rotation that settles
  const wiggle = spring({
    frame: elapsed,
    fps,
    config: { damping: 6, stiffness: 300, mass: 0.4 },
  });
  const rotate = interpolate(wiggle, [0, 1], [-15, 0]);

  // Fade out at end
  const opacity = interpolate(frame, [startFrame + holdFrames, endFrame], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pos = SLOT_POSITIONS[callout.slot ?? "topRight"];

  return (
    <div
      style={{
        position: "absolute",
        ...pos,
        zIndex: 20,
        opacity,
        transform: `scale(${finalScale}) rotate(${rotate}deg)`,
        transformOrigin: "center bottom",
        fontSize: 88,
        lineHeight: 1,
        filter: "drop-shadow(0 6px 18px rgba(0,0,0,0.7))",
      }}
    >
      {callout.emoji}
    </div>
  );
};

// ── Floating image card — slides in from side, holds, fades out ───────────────
const VisualCard: React.FC<{ v: Visual; fps: number }> = ({ v, fps }) => {
  const frame = useCurrentFrame();
  const startF = Math.round(v.at * fps);
  const holdF  = Math.round(3.8 * fps);
  const fadeF  = Math.round(0.7 * fps);
  const endF   = startF + holdF + fadeF;

  if (frame < startF || frame > endF) return null;
  const elapsed = frame - startF;

  const sp = spring({ frame: elapsed, fps, config: { damping: 16, stiffness: 190, mass: 0.9 } });
  const dir = v.side === "left" ? -1 : 1;
  const tx    = interpolate(sp, [0, 1], [dir * 160, 0]);
  const scale = interpolate(sp, [0, 1], [0.86, 1.0]);
  const opacity = interpolate(frame, [startF + holdF, endF], [1, 0], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  });

  // Centered at bottom — slide direction only affects entrance animation
  const pos: React.CSSProperties = { left: 60, bottom: 160 };

  return (
    <div style={{
      position: "absolute", ...pos,
      width: 960, height: 560,
      borderRadius: 22, overflow: "hidden",
      opacity,
      transform: `translateX(${tx}px) scale(${scale})`,
      boxShadow: "0 28px 80px rgba(0,0,0,0.88), 0 0 0 1px rgba(0,210,255,0.22)",
      zIndex: 8,
    }}>
      {v.clipFile ? (
        <Video
          src={staticFile(v.clipFile)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
          muted
          loop
        />
      ) : (
        <Img
          src={staticFile(v.imageFile)}
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      )}
      {/* subtle cyan glow at bottom of card */}
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "35%",
        background: "linear-gradient(to top, rgba(0,210,255,0.14) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
    </div>
  );
};

// ── Content screen with word-by-word reveal + Ken Burns + callouts ─────────────
interface WordRevealProps {
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  bgImage?: string;
  callouts?: Callout[];
  visuals?: Visual[];
}

const WordReveal: React.FC<WordRevealProps> = ({
  heading,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
  bgImage = "dre_square_v3.png",
  callouts = [],
  visuals = [],
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const words = heading.split(" ").slice(0, 12);
  const lastIdx = words.length - 1;
  const allWordsFrame = lastIdx * 8 + 12;

  // ── Ken Burns: aggressive 22% zoom over screen duration ──────────────────────
  const bgScale = interpolate(frame, [0, durationFrames], [1.0, 1.22], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Screen flash: white bloom for first 4 frames (transition feel) ────────────
  const flash = interpolate(frame, [0, 4], [0.55, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Container fade in / fade out ──────────────────────────────────────────────
  const fadeIn = interpolate(frame, [0, 9], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const fadeOut = interpolate(frame, [durationFrames - 12, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // ── Cyan underline ────────────────────────────────────────────────────────────
  const underlineOpacity = interpolate(frame, [allWordsFrame, allWordsFrame + 12], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const underlineWidth = interpolate(frame, [allWordsFrame, allWordsFrame + 20], [0, 100], {
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
        opacity: fadeIn * fadeOut,
        position: "relative",
        overflow: "hidden",
      }}
    >
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
          bottom: 0, left: 0, right: 0,
          height: "52%",
          background:
            "linear-gradient(to top, rgba(28,36,51,0.97) 0%, rgba(28,36,51,0.45) 55%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Top vignette */}
      <div
        style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "22%",
          background:
            "linear-gradient(to bottom, rgba(28,36,51,0.70) 0%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {/* Screen transition flash */}
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

      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      {/* Words — spring bounce in, staggered */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: "16px",
          maxWidth: "900px",
          position: "relative",
          zIndex: 2,
        }}
      >
        {words.map((word, i) => {
          const delay = i * 8;
          const sp = spring({
            frame: frame - delay,
            fps,
            config: { damping: 12, stiffness: 200, mass: 0.8 },
          });
          const wordOpacity = Math.min(1, sp);
          const ty = interpolate(sp, [0, 1], [45, 0]);
          const wordScale = interpolate(sp, [0, 1], [0.75, 1.0]);

          return (
            <div key={i} style={{ position: "relative", display: "inline-block" }}>
              <span
                style={{
                  fontFamily,
                  fontSize: "72px",
                  fontWeight: 700,
                  color: "white",
                  opacity: wordOpacity,
                  display: "inline-block",
                  transform: `translateY(${ty}px) scale(${wordScale})`,
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
                    boxShadow: "0 0 18px rgba(0, 210, 255, 0.95)",
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
            fontSize: "32px",
            fontWeight: 400,
            color: "#B4C8DA",
            textAlign: "center",
            maxWidth: "780px",
            lineHeight: 1.5,
            position: "relative",
            zIndex: 2,
          }}
        >
          {body}
        </div>
      )}

      {/* Floating callout bubbles */}
      {callouts.map((callout, i) => (
        <CalloutBubble
          key={i}
          callout={callout}
          fps={fps}
          screenDurationFrames={durationFrames}
        />
      ))}

      {/* Contextual image visuals */}
      {visuals.map((v, i) => (
        <VisualCard key={i} v={v} fps={fps} />
      ))}
    </div>
  );
};

// ── Main composition ──────────────────────────────────────────────────────────
export const HookReveal: React.FC<VideoCompositionProps> = ({
  videoScript,
  screenDurations,
  screenHasAudio,
  bgImage = "dre_square_v3.png",
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
            bgImage={bgImage}
            topAligned={true}
          />
        </Sequence>
      )}

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
              bgImage={bgImage}
              callouts={screen.callouts ?? []}
              visuals={screen.visuals ?? []}
            />
          </Sequence>
        );
      })}
    </>
  );
};
