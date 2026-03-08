import { createCanvas } from "canvas";

const WIDTH = 1200;
const HEIGHT = 627;
const GOLD = "#FFD700";
const WHITE = "#FFFFFF";
const ACCENT_BAR = 10;
const BOTTOM_STRIP_H = 80;
const TEXT_BOX_W = 900;
const TEXT_BOX_H = 400;

function extractHeroQuote(postText) {
  const clean = postText.replace(/#\w+/g, "").replace(/\s+/g, " ").trim();
  const words = clean.split(" ").filter(Boolean);
  return words.slice(0, 6).join(" ");
}

function wrapText(ctx, text, maxWidth) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function fitFont(ctx, text, maxW, maxH, startPx, minPx) {
  for (let size = startPx; size >= minPx; size -= 2) {
    ctx.font = `700 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
    const lines = wrapText(ctx, text, maxW);
    const lh = Math.round(size * 1.3);
    if (lines.length * lh <= maxH) return { size, lines, lh };
  }
  // Fallback: use minimum
  ctx.font = `700 ${minPx}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  const lines = wrapText(ctx, text, maxW);
  const lh = Math.round(minPx * 1.3);
  return { size: minPx, lines, lh };
}

export function generateQuoteCard(postText) {
  const canvas = createCanvas(WIDTH, HEIGHT);
  const ctx = canvas.getContext("2d");

  // Background gradient
  const bg = ctx.createLinearGradient(0, 0, WIDTH, HEIGHT);
  bg.addColorStop(0, "#0d0d2b");
  bg.addColorStop(1, "#3b0a6b");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  // Gold left accent bar
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, 0, ACCENT_BAR, HEIGHT);

  // Decorative opening quote mark (300px, 15% opacity)
  ctx.save();
  ctx.globalAlpha = 0.15;
  ctx.fillStyle = GOLD;
  ctx.font = `700 300px Georgia, "Times New Roman", serif`;
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillText("\u201C", ACCENT_BAR + 30, -40);
  ctx.restore();

  // Bottom strip darker overlay
  ctx.save();
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillRect(0, HEIGHT - BOTTOM_STRIP_H, WIDTH, BOTTOM_STRIP_H);
  ctx.restore();

  // Quote text
  const quote = extractHeroQuote(postText);
  const { size, lines, lh } = fitFont(ctx, quote, TEXT_BOX_W, TEXT_BOX_H, 140, 90);

  const totalTextH = lines.length * lh;
  const textAreaCenterX = ACCENT_BAR + (WIDTH - ACCENT_BAR) / 2;
  const textAreaCenterY = (HEIGHT - BOTTOM_STRIP_H) / 2;
  const textStartY = textAreaCenterY - totalTextH / 2;

  ctx.font = `700 ${size}px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillStyle = GOLD;
  ctx.textBaseline = "top";
  ctx.textAlign = "center";

  lines.forEach((line, i) => {
    ctx.fillText(line, textAreaCenterX, textStartY + i * lh);
  });

  // Bottom strip text
  const stripY = HEIGHT - BOTTOM_STRIP_H;
  const stripCenterY = stripY + BOTTOM_STRIP_H / 2;
  const leftX = ACCENT_BAR + 30;

  // "Drevon Bullock"
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = WHITE;
  ctx.font = `700 24px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("Drevon Bullock", leftX, stripCenterY - 14);

  // "AI Consultant"
  ctx.fillStyle = GOLD;
  ctx.font = `400 20px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("AI Consultant", leftX, stripCenterY + 14);

  // "Bullock Consulting Group LLC"
  ctx.textAlign = "right";
  ctx.fillStyle = GOLD;
  ctx.font = `400 20px -apple-system, "Helvetica Neue", Arial, sans-serif`;
  ctx.fillText("Bullock Consulting Group LLC", WIDTH - 30, stripCenterY);

  return canvas.toBuffer("image/png");
}
