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
import type { VideoCompositionProps, VideoScreen, Visual } from "./ListCountdown";

const { fontFamily } = loadFont("normal", { weights: ["400", "600", "700"] });

// ── Brand colors ──────────────────────────────────────────────────────────────
const BG      = "#0d1830";
const CYAN    = "#00c8ff";
const CARD_BG = "#1a2d48";
const WHITE   = "#ffffff";
const MUTED   = "#c8ddf0";
const BORDER  = "#2a4060";

// ── Circuit grid background ───────────────────────────────────────────────────
const CircuitGrid: React.FC = () => (
  <svg
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.10, pointerEvents: "none" }}
  >
    <defs>
      <pattern id="cgrid" width="80" height="80" patternUnits="userSpaceOnUse">
        <path d="M 80 0 L 0 0 0 80" fill="none" stroke={CYAN} strokeWidth="0.6" />
        <circle cx="0" cy="0" r="2" fill={CYAN} />
        <circle cx="80" cy="80" r="1.2" fill={CYAN} />
        <circle cx="80" cy="0" r="1.2" fill={CYAN} />
      </pattern>
    </defs>
    <rect width="100%" height="100%" fill="url(#cgrid)" />
  </svg>
);

// ── Cyan corner brackets ──────────────────────────────────────────────────────
const CornerBrackets: React.FC = () => {
  const S    = 52;   // bracket arm length
  const T    = 3;    // thickness
  const PT   = 240;  // top inset — clear of Instagram top UI safe zone (~250px)
  const PB   = 310;  // bottom inset — inside Instagram bottom UI safe zone
  const PS   = 48;   // side inset
  const C = CYAN;
  const OP = 0.75;

  const corners: Array<React.CSSProperties & { borderStyle: string }> = [
    { top: PT, left:  PS, borderTop: `${T}px solid ${C}`, borderLeft:  `${T}px solid ${C}`, borderStyle: "solid" },
    { top: PT, right: PS, borderTop: `${T}px solid ${C}`, borderRight: `${T}px solid ${C}`, borderStyle: "solid" },
  ];

  return (
    <>
      {corners.map((style, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            width: S,
            height: S,
            opacity: OP,
            ...style,
          }}
        />
      ))}
    </>
  );
};

// ── Bottom bar ────────────────────────────────────────────────────────────────
const BottomBar: React.FC<{ right?: string }> = ({ right = "SHARE & SAVE ↗" }) => (
  <div
    style={{
      position: "absolute",
      bottom: 200,
      left: 64,
      right: 64,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    {/* Ghost watermark */}
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      <span
        style={{
          fontFamily,
          fontSize: 90,
          fontWeight: 700,
          color: "transparent",
          WebkitTextStroke: `1px rgba(0,200,255,0.06)`,
          letterSpacing: 8,
          whiteSpace: "nowrap",
          userSelect: "none",
          textShadow: "0 0 60px rgba(0,200,255,0.04)",
        }}
      >
        DRE&apos;VON BULLOCK
      </span>
    </div>

    <span style={{ fontFamily, fontSize: 26, fontWeight: 700, color: WHITE, letterSpacing: 2, position: "relative", zIndex: 1 }}>
      DRE&apos;VON BULLOCK
    </span>
    <span style={{ fontFamily, fontSize: 24, fontWeight: 600, color: CYAN, letterSpacing: 1.5, position: "relative", zIndex: 1 }}>
      {right}
    </span>
  </div>
);

// ── Floating visual image card (slides in from side, stays until slide ends) ──
const VisualCard: React.FC<{ v: Visual; fps: number; durationFrames: number }> = ({ v, fps, durationFrames }) => {
  const frame = useCurrentFrame();
  const startF    = Math.round(v.at * fps);
  const fadeStart = durationFrames - 15;
  const fadeEnd   = durationFrames;

  if (frame < startF || frame > fadeEnd) return null;
  const elapsed = frame - startF;

  const sp = spring({ frame: elapsed, fps, config: { damping: 16, stiffness: 190, mass: 0.9 } });
  const dir = v.side === "left" ? -1 : 1;
  const tx      = interpolate(sp, [0, 1], [dir * 140, 0]);
  const scale   = interpolate(sp, [0, 1], [0.88, 1.0]);
  const opacity = interpolate(frame, [fadeStart, fadeEnd], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{
      position: "absolute",
      left: 190, top: 1060,
      width: 700, height: 400,
      borderRadius: 18, overflow: "hidden",
      opacity,
      transform: `translateX(${tx}px) scale(${scale})`,
      boxShadow: `0 24px 70px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,200,255,0.25)`,
      zIndex: 10,
    }}>
      <Img
        src={staticFile(v.imageFile)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />
      <div style={{
        position: "absolute", bottom: 0, left: 0, right: 0, height: "40%",
        background: "linear-gradient(to top, rgba(10,15,30,0.85) 0%, transparent 100%)",
        pointerEvents: "none",
      }} />
      {/* Cyan top accent line */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: CYAN,
        boxShadow: `0 0 12px ${CYAN}`,
      }} />
    </div>
  );
};

// ── Top label ─────────────────────────────────────────────────────────────────
const TopLabel: React.FC<{ label: string }> = ({ label }) => (
  <div
    style={{
      position: "absolute",
      top: 260,
      left: 0,
      right: 0,
      display: "flex",
      justifyContent: "center",
    }}
  >
    <span
      style={{
        fontFamily,
        fontSize: 28,
        fontWeight: 600,
        color: CYAN,
        letterSpacing: 6,
        textTransform: "uppercase" as const,
        opacity: 0.9,
      }}
    >
      {label}
    </span>
  </div>
);

// ── Cover slide ───────────────────────────────────────────────────────────────
interface CoverProps {
  heading: string;
  body: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
}

const CoverSlide: React.FC<CoverProps> = ({ heading, body, hasAudio, screenNumber, durationFrames }) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const headSp = spring({ frame, fps, config: { damping: 16, stiffness: 160, mass: 1.0 } });
  const headY  = interpolate(headSp, [0, 1], [60, 0]);
  const headOp = Math.min(1, headSp);

  const subSp = spring({ frame: frame - 14, fps, config: { damping: 16, stiffness: 150, mass: 0.9 } });
  const subY  = interpolate(subSp, [0, 1], [40, 0]);
  const subOp = Math.min(1, Math.max(0, subSp));

  const lineSp = spring({ frame: frame - 28, fps, config: { damping: 20, stiffness: 200, mass: 0.7 } });
  const lineW  = interpolate(lineSp, [0, 1], [0, 220]);
  const lineOp = Math.min(1, Math.max(0, lineSp));

  const ctaSp = spring({ frame: frame - 44, fps, config: { damping: 18, stiffness: 140, mass: 0.8 } });
  const ctaOp = Math.min(1, Math.max(0, ctaSp));
  const ctaY  = interpolate(ctaSp, [0, 1], [30, 0]);

  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width, height, background: BG, position: "relative", overflow: "hidden", opacity: fadeOut, filter: "brightness(1.28)" }}>
      <CircuitGrid />
      <CornerBrackets />
      <TopLabel label="AI AUTOMATION" />

      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      {/* Center content */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          gap: 28,
        }}
      >
        {/* Headline */}
        <div
          style={{
            fontFamily,
            fontSize: 82,
            fontWeight: 700,
            color: WHITE,
            textAlign: "center",
            lineHeight: 1.15,
            opacity: headOp,
            transform: `translateY(${headY}px)`,
            maxWidth: 880,
            textTransform: "uppercase" as const,
            letterSpacing: 1,
          }}
        >
          {heading}
        </div>

        {/* Cyan divider */}
        <div
          style={{
            width: lineW,
            height: 4,
            background: CYAN,
            borderRadius: 2,
            boxShadow: `0 0 20px ${CYAN}`,
            opacity: lineOp,
          }}
        />

        {/* Subtitle */}
        {body && (
          <div
            style={{
              fontFamily,
              fontSize: 36,
              fontWeight: 400,
              color: MUTED,
              textAlign: "center",
              lineHeight: 1.6,
              opacity: subOp,
              transform: `translateY(${subY}px)`,
              maxWidth: 820,
              textTransform: "uppercase" as const,
              letterSpacing: 1,
            }}
          >
            {body}
          </div>
        )}

      </div>

      <BottomBar />
    </div>
  );
};

// ── List item slide (two numbered point boxes) ───────────────────────────────
interface ListItemProps {
  number: number;
  stepLabel: string;
  heading: string;
  points?: [string, string];
  body?: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
  visuals?: Visual[];
}

const ListItemSlide: React.FC<ListItemProps> = ({
  number,
  stepLabel,
  heading,
  points,
  body,
  hasAudio,
  screenNumber,
  durationFrames,
  visuals = [],
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  // Label + headline fade in
  const labelSp = spring({ frame, fps, config: { damping: 18, stiffness: 170, mass: 0.8 } });
  const labelOp = Math.min(1, labelSp);
  const labelY  = interpolate(labelSp, [0, 1], [30, 0]);

  const headSp = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 160, mass: 0.9 } });
  const headOp = Math.min(1, Math.max(0, headSp));
  const headY  = interpolate(headSp, [0, 1], [40, 0]);

  const lineSp = spring({ frame: frame - 20, fps, config: { damping: 20, stiffness: 200, mass: 0.7 } });
  const lineW  = interpolate(lineSp, [0, 1], [0, 180]);
  const lineOp = Math.min(1, Math.max(0, lineSp));

  // Card 1 spring entrance
  const cardSp    = spring({ frame: frame - 36, fps, config: { damping: 12, stiffness: 200, mass: 0.85 } });
  const cardScale = interpolate(cardSp, [0, 1], [0.82, 1.0]);
  const cardOp    = Math.min(1, Math.max(0, cardSp));
  const cardY     = interpolate(cardSp, [0, 1], [50, 0]);

  // Card 2 spring entrance (staggered ~0.5s after card 1)
  const card2Sp    = spring({ frame: frame - 52, fps, config: { damping: 12, stiffness: 200, mass: 0.85 } });
  const card2Scale = interpolate(card2Sp, [0, 1], [0.82, 1.0]);
  const card2Op    = Math.min(1, Math.max(0, card2Sp));
  const card2Y     = interpolate(card2Sp, [0, 1], [50, 0]);

  // Breathing loop after cards settle (3s cycle)
  const breathePhase = ((frame - 50) % 90 + 90) % 90;
  const breathe = interpolate(breathePhase, [0, 45, 90], [0, 5, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const finalCardY  = cardY  + (cardOp  >= 0.99 ? breathe : 0);
  const finalCard2Y = card2Y + (card2Op >= 0.99 ? breathe : 0);

  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  const pt = points ?? (body ? [body, ""] : ["", ""] as [string, string]);

  return (
    <div style={{ width, height, background: BG, position: "relative", overflow: "hidden", opacity: fadeOut, filter: "brightness(1.28)" }}>
      <CircuitGrid />
      <CornerBrackets />
      <TopLabel label={stepLabel} />

      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "flex-start",
          padding: "340px 72px 0",
          gap: 24,
        }}
      >
        {/* Headline */}
        <div
          style={{
            fontFamily,
            fontSize: 64,
            fontWeight: 700,
            color: WHITE,
            textAlign: "center",
            lineHeight: 1.2,
            opacity: headOp,
            transform: `translateY(${headY}px)`,
            maxWidth: 860,
            textTransform: "uppercase" as const,
            letterSpacing: 1,
          }}
        >
          {heading}
        </div>

        {/* Cyan divider */}
        <div
          style={{
            width: lineW,
            height: 3,
            background: CYAN,
            borderRadius: 2,
            boxShadow: `0 0 16px ${CYAN}`,
            opacity: lineOp,
          }}
        />

        {/* Two point boxes */}
        <div style={{ width: "100%", maxWidth: 860, display: "flex", flexDirection: "column", gap: 40 }}>

          {/* Box 01 */}
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: "24px 36px",
              display: "flex",
              alignItems: "center",
              gap: 28,
              opacity: cardOp,
              transform: `translateY(${finalCardY}px) scale(${cardScale})`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,200,255,0.25), 0 0 32px rgba(0,200,255,0.08)`,
            }}
          >
            <div style={{
              flexShrink: 0, width: 56, height: 56, borderRadius: 12,
              background: `linear-gradient(135deg, ${CYAN}22, ${CYAN}44)`,
              border: `2px solid ${CYAN}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${CYAN}44`,
            }}>
              <span style={{ fontFamily, fontSize: 26, fontWeight: 700, color: CYAN }}>01</span>
            </div>
            <div style={{ fontFamily, fontSize: 30, fontWeight: 400, color: MUTED, lineHeight: 1.5, flex: 1 }}>
              {pt[0]}
            </div>
          </div>

          {/* Box 02 */}
          <div
            style={{
              background: CARD_BG,
              border: `1px solid ${BORDER}`,
              borderRadius: 18,
              padding: "24px 36px",
              display: "flex",
              alignItems: "center",
              gap: 28,
              opacity: card2Op,
              transform: `translateY(${finalCard2Y}px) scale(${card2Scale})`,
              boxShadow: `0 16px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(0,200,255,0.25), 0 0 32px rgba(0,200,255,0.08)`,
            }}
          >
            <div style={{
              flexShrink: 0, width: 56, height: 56, borderRadius: 12,
              background: `linear-gradient(135deg, ${CYAN}22, ${CYAN}44)`,
              border: `2px solid ${CYAN}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 0 20px ${CYAN}44`,
            }}>
              <span style={{ fontFamily, fontSize: 26, fontWeight: 700, color: CYAN }}>02</span>
            </div>
            <div style={{ fontFamily, fontSize: 30, fontWeight: 400, color: MUTED, lineHeight: 1.5, flex: 1 }}>
              {pt[1]}
            </div>
          </div>

        </div>
      </div>

      {/* Contextual image visuals — stays visible until slide ends */}
      {visuals.map((v, i) => (
        <VisualCard key={i} v={v} fps={fps} durationFrames={durationFrames} />
      ))}

      <BottomBar />
    </div>
  );
};

// ── CTA slide ─────────────────────────────────────────────────────────────────
interface CTASlideProps {
  heading: string;
  body: string;
  keyword: string;
  hasAudio: boolean;
  screenNumber: number;
  durationFrames: number;
}

const CTASlideComponent: React.FC<CTASlideProps> = ({
  heading,
  body,
  keyword,
  hasAudio,
  screenNumber,
  durationFrames,
}) => {
  const frame = useCurrentFrame();
  const { width, height, fps } = useVideoConfig();

  const headSp = spring({ frame, fps, config: { damping: 16, stiffness: 160, mass: 1.0 } });
  const headOp = Math.min(1, headSp);
  const headY  = interpolate(headSp, [0, 1], [60, 0]);

  const bodySp = spring({ frame: frame - 16, fps, config: { damping: 18, stiffness: 150, mass: 0.9 } });
  const bodyOp = Math.min(1, Math.max(0, bodySp));
  const bodyY  = interpolate(bodySp, [0, 1], [40, 0]);

  const kwSp   = spring({ frame: frame - 34, fps, config: { damping: 12, stiffness: 200, mass: 0.85 } });
  const kwScale= interpolate(kwSp, [0, 1], [0.8, 1.0]);
  const kwOp   = Math.min(1, Math.max(0, kwSp));

  const btnSp  = spring({ frame: frame - 52, fps, config: { damping: 14, stiffness: 180, mass: 0.8 } });
  const btnOp  = Math.min(1, Math.max(0, btnSp));
  const btnY   = interpolate(btnSp, [0, 1], [30, 0]);

  // Pulse on keyword badge
  const pulse = interpolate(
    ((frame - 80) % 60 + 60) % 60,
    [0, 30, 60],
    [1.0, 1.04, 1.0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const kwFinalScale = kwOp >= 0.99 ? kwScale * pulse : kwScale;

  const fadeOut = interpolate(frame, [durationFrames - 15, durationFrames], [1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <div style={{ width, height, background: BG, position: "relative", overflow: "hidden", opacity: fadeOut, filter: "brightness(1.28)" }}>
      <CircuitGrid />
      <CornerBrackets />
      <TopLabel label="FREE RESOURCE" />

      {hasAudio && <Audio src={staticFile(`voice_${screenNumber}.mp3`)} />}

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 80px",
          gap: 32,
        }}
      >
        {/* Heading */}
        <div
          style={{
            fontFamily,
            fontSize: 68,
            fontWeight: 700,
            color: WHITE,
            textAlign: "center",
            lineHeight: 1.2,
            opacity: headOp,
            transform: `translateY(${headY}px)`,
            maxWidth: 860,
            textTransform: "uppercase" as const,
            letterSpacing: 1,
          }}
        >
          {heading}
        </div>

        {/* Body */}
        {body && (
          <div
            style={{
              fontFamily,
              fontSize: 34,
              fontWeight: 400,
              color: MUTED,
              textAlign: "center",
              lineHeight: 1.6,
              opacity: bodyOp,
              transform: `translateY(${bodyY}px)`,
              maxWidth: 800,
            }}
          >
            {body}
          </div>
        )}

        {/* Keyword CTA badge */}
        <div
          style={{
            background: `linear-gradient(135deg, ${CYAN}22, ${CYAN}44)`,
            border: `2px solid ${CYAN}`,
            borderRadius: 16,
            padding: "20px 48px",
            opacity: kwOp,
            transform: `scale(${kwFinalScale})`,
            boxShadow: `0 0 40px ${CYAN}55`,
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: 40,
              fontWeight: 700,
              color: CYAN,
              letterSpacing: 3,
            }}
          >
            {keyword}
          </span>
        </div>

        {/* Follow button */}
        <div
          style={{
            background: CYAN,
            borderRadius: 12,
            padding: "18px 44px",
            opacity: btnOp,
            transform: `translateY(${btnY}px)`,
          }}
        >
          <span
            style={{
              fontFamily,
              fontSize: 30,
              fontWeight: 700,
              color: BG,
              letterSpacing: 1,
            }}
          >
            FOLLOW FOR DAILY AI
          </span>
        </div>
      </div>

      <BottomBar right="FOLLOW & SAVE ↗" />
    </div>
  );
};

// ── Extract keyword from CTA heading ─────────────────────────────────────────
function extractKeyword(heading: string): string {
  const match = heading.match(/"([^"]+)"/);
  return match?.[1] ?? "COMMENT";
}

// ── Main CarouselSlide composition ────────────────────────────────────────────
export const CarouselSlide: React.FC<VideoCompositionProps> = ({
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

  const lastIdx = screens.length - 1;

  // Determine step labels for teaching screens
  const teachingScreens = screens.slice(1, lastIdx);
  const teachingCount = teachingScreens.length;

  return (
    <>
      {/* Screen 0: Cover */}
      {screens[0] && (
        <Sequence from={startFrames[0]} durationInFrames={Math.round((screenDurations[0] ?? 3) * FPS)}>
          <CoverSlide
            heading={screens[0].heading}
            body={screens[0].body ?? ""}
            hasAudio={screenHasAudio[0] ?? false}
            screenNumber={screens[0].screen}
            durationFrames={Math.round((screenDurations[0] ?? 3) * FPS)}
          />
        </Sequence>
      )}

      {/* Teaching screens: numbered list cards */}
      {teachingScreens.map((screen, i) => {
        const idx = i + 1;
        const durationFrames = Math.round((screenDurations[idx] ?? 7) * FPS);
        const num = i + 1;
        const stepLabel = `STEP ${String(num).padStart(2, "0")} OF ${String(teachingCount).padStart(2, "0")}`;

        return (
          <Sequence key={screen.screen} from={startFrames[idx]} durationInFrames={durationFrames}>
            <ListItemSlide
              number={num}
              stepLabel={stepLabel}
              heading={screen.heading}
              points={screen.points}
              body={screen.body}
              hasAudio={screenHasAudio[idx] ?? false}
              screenNumber={screen.screen}
              durationFrames={durationFrames}
              visuals={screen.visuals ?? []}
            />
          </Sequence>
        );
      })}

      {/* Last screen: CTA */}
      {screens[lastIdx] && lastIdx > 0 && (
        <Sequence
          from={startFrames[lastIdx]}
          durationInFrames={Math.round((screenDurations[lastIdx] ?? 7) * FPS)}
        >
          <CTASlideComponent
            heading={screens[lastIdx].heading}
            body={screens[lastIdx].body ?? ""}
            keyword={extractKeyword(screens[lastIdx].heading)}
            hasAudio={screenHasAudio[lastIdx] ?? false}
            screenNumber={screens[lastIdx].screen}
            durationFrames={Math.round((screenDurations[lastIdx] ?? 7) * FPS)}
          />
        </Sequence>
      )}
    </>
  );
};
