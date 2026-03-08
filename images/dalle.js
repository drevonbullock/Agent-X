import OpenAI from "openai";
import https from "https";

const client = new OpenAI();

export async function generateDalleImage(postText) {
  const prompt = `Dark cinematic digital art. Deep blacks with glowing orange neon accents. Tech-forward, futuristic atmosphere. Abstract visualization of: "${postText}". No text or typography in the image. Hyper-detailed, dramatic lighting, AI and technology aesthetic. Orange light traces, dark steel surfaces, cinematic composition.`;

  const response = await client.images.generate({
    model: "dall-e-3",
    prompt,
    n: 1,
    size: "1792x1024",
    response_format: "url",
  });

  const imageUrl = response.data[0].url;
  const buffer = await fetchImageBuffer(imageUrl);
  return buffer;
}

function fetchImageBuffer(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = [];
      res.on("data", (chunk) => chunks.push(chunk));
      res.on("end", () => resolve(Buffer.concat(chunks)));
      res.on("error", reject);
    });
  });
}
