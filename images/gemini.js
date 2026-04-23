// Gemini 2.0 Flash — cinematic thematic image generation for VISUAL mode posts
// Uses generateContent endpoint with responseModalities: IMAGE

const MODEL = "gemini-2.5-flash-image";
const RETRY_DELAYS_MS = [5000, 15000, 30000]; // 5s, 15s, 30s backoff for 503s

export async function generateGeminiImage(imagePrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set in .env");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  let lastError;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      const delay = RETRY_DELAYS_MS[attempt - 1];
      console.log(`[Gemini] Retry ${attempt}/${RETRY_DELAYS_MS.length} after ${delay / 1000}s...`);
      await new Promise((r) => setTimeout(r, delay));
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: imagePrompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      }),
    });

    if (res.status === 503 || res.status === 429) {
      const errorBody = await res.json().catch(() => ({}));
      lastError = new Error(`Gemini image generation failed (${res.status}): ${JSON.stringify(errorBody)}`);
      console.warn(`[Gemini] ${res.status} — will retry: ${errorBody?.error?.message ?? "overloaded"}`);
      continue;
    }

    if (!res.ok) {
      const errorBody = await res.json().catch(() => res.text());
      console.log("Gemini full error:", JSON.stringify(errorBody, null, 2));
      throw new Error(`Gemini image generation failed (${res.status}): ${JSON.stringify(errorBody)}`);
    }

    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts ?? [];
    const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
    if (!imagePart) {
      const textPart = parts.find((p) => p.text);
      console.error("[Gemini] No image in response. Parts:", JSON.stringify(parts.map((p) => ({
        hasText: !!p.text,
        textSnippet: p.text?.slice(0, 200),
        hasInlineData: !!p.inlineData,
        mimeType: p.inlineData?.mimeType,
      })), null, 2));
      if (data.promptFeedback) console.error("[Gemini] Prompt feedback:", JSON.stringify(data.promptFeedback));
      throw new Error(`Gemini returned no image data${textPart ? ` — text: "${textPart.text?.slice(0, 100)}"` : ""}`);
    }

    return Buffer.from(imagePart.inlineData.data, "base64");
  }

  throw lastError ?? new Error("Gemini image generation failed after retries");
}
