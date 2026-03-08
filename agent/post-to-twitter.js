import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

const rwClient = client.readWrite;

export async function postTweet(tweetText, imageBuffer, mimeType) {
  let mediaId;
  try {
    console.log(`[Twitter] Uploading media (${mimeType}, ${imageBuffer.length} bytes)...`);
    mediaId = await rwClient.v1.uploadMedia(imageBuffer, { mimeType });
    console.log(`[Twitter] Media uploaded. ID: ${mediaId}`);
  } catch (err) {
    console.error(`[Twitter] Media upload failed`);
    console.error(`[Twitter] Status: ${err.code ?? err.status}`);
    console.error(`[Twitter] Error data:`, JSON.stringify(err.data ?? err, null, 2));
    throw err;
  }

  let tweet;
  const maxRetries = 3;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Twitter] Posting tweet${attempt > 1 ? ` (attempt ${attempt}/${maxRetries})` : ""}...`);
      tweet = await rwClient.v2.tweet({
        text: tweetText,
        media: { media_ids: [mediaId] },
      });
      console.log(`[Twitter] Tweet posted. Raw response:`, JSON.stringify(tweet, null, 2));
      break;
    } catch (err) {
      const status = err.code ?? err.status;
      if (status === 503 && attempt < maxRetries) {
        console.warn(`[Twitter] Tweet post failed with 503 (attempt ${attempt}/${maxRetries}). Retrying in 5s...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else if (status === 503 && attempt === maxRetries) {
        console.warn(`[Twitter] v2 tweet endpoint returned 503 after all retries. Falling back to v1.1...`);
        try {
          const v1Tweet = await rwClient.v1.tweet(tweetText, { media_ids: mediaId });
          console.log(`[Twitter] Tweet posted via v1.1 fallback. Raw response:`, JSON.stringify(v1Tweet, null, 2));
          tweet = { data: { id: String(v1Tweet.id_str ?? v1Tweet.id) } };
          break;
        } catch (v1Err) {
          console.error(`[Twitter] v1.1 fallback also failed`);
          console.error(`[Twitter] Status: ${v1Err.code ?? v1Err.status}`);
          console.error(`[Twitter] Error data:`, JSON.stringify(v1Err.data ?? v1Err, null, 2));
          throw v1Err;
        }
      } else {
        console.error(`[Twitter] Tweet post failed`);
        console.error(`[Twitter] Status: ${status}`);
        console.error(`[Twitter] Error data:`, JSON.stringify(err.data ?? err, null, 2));
        throw err;
      }
    }
  }

  const tweetId = tweet.data.id;
  const username = (await rwClient.v2.me()).data.username;
  const tweetUrl = `https://x.com/${username}/status/${tweetId}`;

  return { tweetId, tweetUrl };
}
