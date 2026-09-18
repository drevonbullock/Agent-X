import React from "react";
import { Composition } from "remotion";
import { WickReel, wickReelSchema } from "./WickReel";
import { WickExplainer, explainerSchema, SCENE_FRAMES } from "./WickExplainer";
import { ExplainerFilm, filmSchema } from "./ExplainerFilm";
import { PaperReel, paperReelSchema } from "./PaperReel";
import { QuickTipReel, quickTipSchema } from "./QuickTipReel";
import { CinematicTipReel } from "./CinematicTipReel";
import film from "../../data/explainer-paycheck.json";

// 1080x1920 @ 30fps. Duration is derived from the beats so a 3-beat and a
// 5-beat reel both time correctly: 90 hook + 105/beat + 150 payoff.
export const RemotionRoot: React.FC = () => (
  <>
  <Composition
    id="WickReel"
    component={WickReel}
    schema={wickReelSchema}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90 + 105 * 4 + 150}
    calculateMetadata={({ props }) => ({
      durationInFrames: 90 + 105 * (props.beats?.length ?? 4) + 150,
    })}
    defaultProps={{
      hook: "YOU ARE LOSING $1,000 A YEAR",
      total: 1000,
      closing: "You did not choose it. The default did.",
      heroClip: null,
      beats: [
        { title: "The Fee Nobody Checks", problem: "A $50 yearly fee is 14 cents a day you never counted.", how: "Divide your biggest fee by 365 tonight.", amount: 240, image: "" },
        { title: "The Price That Crept", problem: "Four bills each rose $5 a month while you looked away.", how: "Open last January's statement and compare.", amount: 240, image: "" },
        { title: "The Tier You Outgrew", problem: "You pay for premium on an app you open twice a month.", how: "Downgrade one subscription before bed.", amount: 280, image: "" },
        { title: "The Renewal You Skipped", problem: "The date chose for you because you never set a reminder.", how: "Put every renewal date in one calendar.", amount: 240, image: "" },
      ],
    }}
  />
  <Composition
    id="WickExplainer"
    component={WickExplainer}
    schema={explainerSchema}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={78 + SCENE_FRAMES * 3 + 96}
    calculateMetadata={({ props }) => ({
      // Narration-driven when voiceover has been generated; falls back to the
      // fixed beat otherwise.
      durationInFrames: props.timing
        ? props.timing.title + props.timing.scenes.reduce((a: number, b: number) => a + b, 0) + props.timing.close
        : 78 + SCENE_FRAMES * (props.scenes?.length ?? 3) + 96,
    })}
    defaultProps={{
      title: "$5 A DAY IS $1,825 A YEAR",
      subtitle: "The number you ignore is the number that decides.",
      closing: "Small is not the same as nothing.",
      wickImage: "hook.jpg",
      scenes: [
        { type: "multiply" as const, caption: "One small habit, every day.",
          unit: 5, times: 365, unitLabel: "a day", totalLabel: "a year" },
        { type: "leak" as const, caption: "Where a $1,000 balance actually goes.",
          start: 1000, leaks: [
            { label: "Subscriptions you forgot", amount: 240 },
            { label: "Fees nobody checks", amount: 180 },
            { label: "The premium tier you outgrew", amount: 280 } ] },
        { type: "race" as const, caption: "Same start. One choice apart.",
          years: 10, a: { label: "Kept the number", start: 1000, rate: 0.08 },
          b: { label: "Spent the difference", start: 1000, rate: 0.01 } },
      ],
    }}
  />
  <Composition
    id="ExplainerFilm"
    component={ExplainerFilm}
    schema={filmSchema}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={5 * 95}
    defaultProps={film as any}
    calculateMetadata={({ props }) => ({
      // Runtime follows the narration once the voice pass has measured it.
      durationInFrames: (props.shots ?? []).reduce((a: number, s: any) => a + (s.frames ?? 95), 0) || 475,
    })}
  />
  <Composition
    id="PaperReel"
    component={PaperReel}
    schema={paperReelSchema}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={90 + 150 * 3 + 180}
    calculateMetadata={({ props }) => ({
      // Cut to the narrator: every scene is as long as its measured voice line.
      durationInFrames: props.timing
        ? props.timing.hook + props.timing.beats.reduce((a: number, b: number) => a + b, 0) + props.timing.close
        : 90 + 150 * (props.beats?.length ?? 3) + 180,
    })}
    defaultProps={{
      topic: "Investing",
      hook: { headline: "YOU ARE LOSING $65 TO THE WRONG FUND", image: "hook.jpg" },
      beats: [
        { number: 1, title: "Three Funds, One Job", line: "Know what each one owns before you buy a single share.", how: "Pull up all three tickers side by side.", figure: null, image: "beat-0.jpg" },
        { number: 2, title: "SPY Costs $9 A Year", line: "SPY charges $9.45 a year on $10,000.", how: "Check the expense ratio before you buy.", figure: "$9.45", image: "beat-1.jpg" },
        { number: 3, title: "$65 Over Ten Years", line: "That $65 gap stays in your account with the right fund.", how: "Buy VOO or VTI on Webull.", figure: "$64.50", image: "beat-2.jpg" },
      ],
      close: { steps: ["Pull up all three tickers.", "Check the expense ratio.", "Buy VOO or VTI."], closing: "Pick the cheap one.", sendTo: "the friend who owns SPY", image: "close.jpg" },
    }}
  />
  <Composition
    id="QuickTipReel"
    component={QuickTipReel}
    schema={quickTipSchema}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={540}
    calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames ?? 540 })}
    defaultProps={{
      topic: "Investing", audio: null, durationInFrames: 540, shakeAt: null,
      hookText: { kicker: "SPY VS VOO", big: "3X THE FEE", accent: "3X" },
      lock: { big: "3 STEPS", accent: "3", stamp: "TONIGHT" },
      tip1: { label: "Open Webull. Search VOO.", query: "VOO", results: [{ ticker: "VOO", name: "Vanguard S&P 500 ETF" }, { ticker: "SPY", name: "SPDR S&P 500 ETF Trust" }] },
      tip2: { label: "Check the fee.", bars: [{ ticker: "VOO", value: 0.03, text: "0.03%" }, { ticker: "SPY", value: 0.0945, text: "0.0945%" }], callout: "OVER 3X" },
      tip3: { label: "Buy the cheap one.", basis: "ON $10,000 · EVERY YEAR", good: { ticker: "VOO", amount: "$3.00" }, bad: { ticker: "SPY", amount: "$9.45" }, footer: "10 YEARS: $64.50 STAYS YOURS", footerAccent: "$64.50", note: "Fees only, before any growth." },
      close: { lead: "SEND THIS TO", sendTo: "the friend who owns SPY" },
      images: { hook: "hook.jpg", lock: "beat-0.jpg", tip1: "beat-1.jpg", tip2: "beat-2.jpg", tip3: "beat-3.jpg", close: "close.jpg" },
      scenes: [{ id: "hook", from: 0, to: 75 }, { id: "lock", from: 75, to: 120 }, { id: "tip1", from: 120, to: 210 }, { id: "tip2", from: 210, to: 300 }, { id: "tip3", from: 300, to: 440 }, { id: "close", from: 440, to: 540 }],
      words: [],
    }}
  />
  <Composition
    id="CinematicTipReel"
    component={CinematicTipReel}
    schema={quickTipSchema}
    width={1080}
    height={1920}
    fps={30}
    durationInFrames={540}
    calculateMetadata={({ props }) => ({ durationInFrames: props.durationInFrames ?? 540 })}
    defaultProps={{
      topic: "Investing", audio: null, durationInFrames: 540, shakeAt: null,
      hookText: { kicker: "30 YEARS · 7% A YEAR", big: "$100 TO $122K", accent: "$122K" },
      lock: { big: "ONLY $100/MO", accent: "$100/MO", stamp: "TONIGHT" },
      tip1: { label: "Open Webull. Search VOO.", query: "VOO", results: [{ ticker: "VOO", name: "Vanguard S&P 500 ETF" }] },
      tip2: { kind: "recurring", label: "Set a $100 monthly buy.", title: "RECURRING BUY", rows: [{ k: "Amount", v: "$100" }], offText: "Auto-invest off", onText: "Auto-invest ON" },
      tip3: { kind: "growth", label: "Leave it 30 years.", bars: [{ label: "30 YRS", value: 121997 }], footer: "YOU PUT IN $36,000", footerAccent: "$36,000", note: "At 7% a year." },
      close: { lead: "SEND THIS TO", sendTo: "THE FRIEND WHO KEEPS WAITING" },
      images: { hook: "hook.jpg", lock: "beat-0.jpg", tip1: "beat-1.jpg", tip2: "beat-2.jpg", tip3: "beat-3.jpg", close: "close.jpg" },
      scenes: [{ id: "hook", from: 0, to: 90 }, { id: "lock", from: 90, to: 180 }, { id: "tip1", from: 180, to: 270 }, { id: "tip2", from: 270, to: 360 }, { id: "tip3", from: 360, to: 450 }, { id: "close", from: 450, to: 540 }],
      words: [],
    }}
  />
  </>
);
