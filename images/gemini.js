// Gemini 2.0 Flash — cinematic thematic image generation for VISUAL mode posts
// Uses generateContent endpoint with responseModalities: IMAGE

const MODEL = "gemini-2.0-flash-exp-image-generation";

export async function generateGeminiImage(imagePrompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY not set in .env");

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: imagePrompt }] }],
      generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Gemini image generation failed (${res.status}): ${err}`);
  }

  const data = await res.json();
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!imagePart) {
    throw new Error("Gemini returned no image data");
  }

  return Buffer.from(imagePart.inlineData.data, "base64");
}
