// SFX for chapters 2 → close, on the same absolute times the visuals use.
import { buffer, whoosh, pop, thud, tick, coins, bell, shimmer, paper, reverb, writeWav } from "../../lib/synth.mjs";
const b = buffer(421);
const P = (t, v = 0.28, a = 900, z = 300) => pop(b, t, v, a, z);
// CH2
whoosh(b, 115.2, 1.0, 0.18); whoosh(b, 119.3, 2.5, 0.12, 80, 600, 3); thud(b, 119.8, 0.6); thud(b, 121.6, 0.45);
tick(b, 122.9, 0.3, 2400); whoosh(b, 123.4, 0.5, 0.3, 400, 4000, 8); whoosh(b, 124.2, 2.0, 0.16, 150, 1000, 2); thud(b, 126.2, 0.7);
whoosh(b, 128.4, 1.0, 0.16); P(129.5); P(132.5); P(132.7); whoosh(b, 133.5, 0.8, 0.16); [135.0, 136.7, 138.6].forEach((t) => { P(t); tick(b, t + 0.2, 0.15, 3000); });
whoosh(b, 141.9, 0.8, 0.15); for (let i = 0; i < 5; i++) P(142.1 + i * 0.12, 0.2, 700, 300); [145.3, 145.6, 146.4].forEach((t) => P(t, 0.3)); whoosh(b, 147.2, 1.0, 0.15); bell(b, 151.6, 1046.5, 0.07);
// CH3
whoosh(b, 152.8, 0.9, 0.18); thud(b, 156.7, 0.4); [160.3, 160.5].forEach((t) => tick(b, t, 0.2, 2000)); whoosh(b, 160.6, 0.9, 0.14); bell(b, 164.8, 1318, 0.05);
for (let i = 0; i < 5; i++) { P(171.1 + i * 0.5, 0.4, 500, 120); paper(b, 171.1 + i * 0.5, 0.2, 0.12); } for (let i = 0; i < 3; i++) P(175.0 + i * 0.12, 0.2);
thud(b, 180.8, 0.35); whoosh(b, 181.4, 0.9, 0.14); for (let i = 0; i < 12; i++) tick(b, 182.0 + i * 0.25, 0.1, 1800, i);
whoosh(b, 185.6, 0.9, 0.14); for (let i = 0; i < 5; i++) whoosh(b, 187.4 + i * 0.3, 0.3, 0.08, 1500, 5000, i); shimmer(b, 189.6, 191.5, 0.04);
whoosh(b, 191.0, 0.8, 0.15); [192.2, 194.2, 196.4].forEach((t) => P(t, 0.3)); whoosh(b, 197.8, 3.4, 0.06, 400, 2000, 5);
// CH4
whoosh(b, 201.8, 1.0, 0.16); paper(b, 202.8, 0.5, 0.1); P(210.6); bell(b, 212.9, 1318, 0.06); whoosh(b, 213.6, 0.9, 0.16);
for (let i = 0; i < 8; i++) whoosh(b, 215.2 + i * 1.3, 0.4, 0.07, 800, 3000, i); whoosh(b, 226.3, 1.0, 0.14); coins(b, 229.4, 0.1);
whoosh(b, 230.8, 0.8, 0.16); for (let i = 0; i < 30; i++) tick(b, 231.2 + i * 0.27, 0.09, 3400, i); bell(b, 239.2, 880, 0.06);
whoosh(b, 240.4, 0.9, 0.16); P(244.1); P(244.6); thud(b, 245.6, 0.35); whoosh(b, 253.2, 1.2, 0.18); thud(b, 254.1, 0.55); coins(b, 262.2, 0.06);
// TURN
whoosh(b, 265.2, 1.0, 0.16); [270.2, 271.6, 272.8, 274.6].forEach((t) => { P(t, 0.3); whoosh(b, t - 0.4, 0.4, 0.1); }); shimmer(b, 280.4, 282, 0.035);
whoosh(b, 282.8, 1.0, 0.15); for (let i = 0; i < 16; i++) tick(b, 283.2 + i * 0.35, 0.08, 2600, i); paper(b, 285.3, 0.3, 0.12);
whoosh(b, 289.4, 0.9, 0.15); for (let i = 0; i < 3; i++) paper(b, 289.8 + i * 0.6, 0.25, 0.1); thud(b, 293.7, 0.4);
whoosh(b, 297.2, 1.0, 0.15); [302.6, 304.6, 307.2].forEach((t) => P(t, 0.3)); bell(b, 309.3, 784, 0.08); shimmer(b, 314.8, 318, 0.035); paper(b, 319.4, 1.8, 0.08); P(323.0);
// PAYOFF
whoosh(b, 325.2, 1.0, 0.16); P(328.3); P(331.6); P(333.7); for (let i = 0; i < 50; i++) tick(b, 334.0 + i * 0.064, 0.07, 3000, i);
whoosh(b, 338.6, 0.9, 0.16); coins(b, 344.6, 0.07); whoosh(b, 353.2, 0.9, 0.16); coins(b, 354.8, 0.08); for (let i = 0; i < 6; i++) P(360.3 + i * 0.9, 0.18, 1200, 700);
whoosh(b, 368.2, 1.0, 0.16); [371.2, 371.5].forEach((t) => P(t, 0.25)); [380.0, 381.4, 382.8].forEach((t) => thud(b, t, 0.45));
// CLOSE
whoosh(b, 383.6, 1.0, 0.16); [389.5, 391.0, 391.8, 394.0].forEach((t) => P(t, 0.25)); whoosh(b, 397.6, 0.9, 0.15); for (let i = 0; i < 5; i++) P(398.6 + i * 0.18, 0.2, 1000, 500);
whoosh(b, 400.4, 1.6, 0.14, 150, 1000, 2); bell(b, 405.9, 880, 0.06); whoosh(b, 406.8, 1.2, 0.14); shimmer(b, 410, 415, 0.035); P(411.6, 0.3);
reverb(b, 0.18, 1);
writeWav(new URL("./sfx.wav", import.meta.url).pathname, b);
console.log("sfx ok");
