import React from "react";
import { Composition } from "remotion";
import { HookReveal } from "./compositions/HookReveal";
import { ExplainerVertical } from "./compositions/ExplainerVertical";
import { StatStack } from "./compositions/StatStack";
import { ProblemSolution } from "./compositions/ProblemSolution";
import { ListCountdown } from "./compositions/ListCountdown";
import { ReviewCard } from "./compositions/ReviewCard";
import { NewsReactive } from "./compositions/NewsReactive";
import { AdCreative } from "./compositions/AdCreative";
import { CarouselSlide } from "./compositions/CarouselSlide";
import type { VideoCompositionProps } from "./compositions/ListCountdown";

const PREVIEW_SCRIPT: VideoCompositionProps["videoScript"] = [
  { screen: 1, heading: "What they don't tell you about AI", body: "" },
  { screen: 2, heading: "Most businesses use tools, not systems", body: "", points: ["A tool needs you to log in and use it.", "A system runs on its own — no input required."] },
  { screen: 3, heading: "Systems work while you sleep", body: "", points: ["Lead capture, follow-up, booking — all handled.", "No one has to touch it for it to run."] },
  { screen: 4, heading: "The difference is leverage", body: "", points: ["One hour of setup replaces four hours weekly.", "Every week. Permanently."] },
  { screen: 5, heading: 'Comment "AUTOMATE"', body: "and I'll send you my free AI systems playbook." },
];

const PREVIEW_DURATIONS = [2.5, 7.5, 7.5, 7.5, 6.0];
const PREVIEW_HAS_AUDIO = [false, false, false, false, false];
const PREVIEW_TOTAL = PREVIEW_DURATIONS.reduce((a, b) => a + b, 0);

const DEFAULT_PROPS: VideoCompositionProps = {
  videoScript: PREVIEW_SCRIPT,
  screenDurations: PREVIEW_DURATIONS,
  screenHasAudio: PREVIEW_HAS_AUDIO,
  totalDurationSeconds: PREVIEW_TOTAL,
};

const calcMeta = ({ props }: { props: VideoCompositionProps }) => ({
  durationInFrames: Math.round((props.totalDurationSeconds ?? 25) * 30),
});

export const RemotionRoot: React.FC = () => {
  return (
    <>
      {/* ── Square 1:1 (1080×1080) — LinkedIn feed, Instagram feed ─────────── */}
      <Composition
        id="ListCountdown"
        component={ListCountdown}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />
      <Composition
        id="HookReveal"
        component={HookReveal}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />
      <Composition
        id="StatStack"
        component={StatStack}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />
      <Composition
        id="ProblemSolution"
        component={ProblemSolution}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />
      <Composition
        id="ReviewCard"
        component={ReviewCard}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />

      {/* ── Vertical 9:16 (1080×1920) — Instagram Reels, TikTok, YouTube Shorts ── */}
      <Composition
        id="HookRevealVertical"
        component={HookReveal}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...DEFAULT_PROPS, bgImage: "dre_vertical_v3.png" }}
        calculateMetadata={calcMeta}
      />
      <Composition
        id="ExplainerVertical"
        component={ExplainerVertical}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />

      {/* ── Carousel 9:16 (1080×1920) — Instagram Reels, BCG carousel style ── */}
      <Composition
        id="CarouselSlideVertical"
        component={CarouselSlide}
        durationInFrames={750}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{ ...DEFAULT_PROPS }}
        calculateMetadata={calcMeta}
      />

      {/* ── Horizontal 16:9 (1920×1080) — LinkedIn video, YouTube, X ─────── */}
      <Composition
        id="NewsReactive"
        component={NewsReactive}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />
      <Composition
        id="AdCreative"
        component={AdCreative}
        durationInFrames={750}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={DEFAULT_PROPS}
        calculateMetadata={calcMeta}
      />
    </>
  );
};
