import React from "react";
import { Composition } from "remotion";
import { WickReel, wickReelSchema } from "./WickReel";

// 1080x1920 @ 30fps. Duration is derived from the beats so a 3-beat and a
// 5-beat reel both time correctly: 90 hook + 105/beat + 150 payoff.
export const RemotionRoot: React.FC = () => (
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
);
