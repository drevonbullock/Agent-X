import "dotenv/config";
import { TwitterApi } from "twitter-api-v2";

const client = new TwitterApi({
  appKey: process.env.TWITTER_API_KEY,
  appSecret: process.env.TWITTER_API_SECRET,
  accessToken: process.env.TWITTER_ACCESS_TOKEN,
  accessSecret: process.env.TWITTER_ACCESS_SECRET,
});

try {
  const tweet = await client.v2.tweet("Agent X is online. 🤖 #buildinpublic");
  const tweetId = tweet.data.id;
  console.log("Posted!", `https://x.com/i/status/${tweetId}`);
} catch (err) {
  console.error("Failed. Status:", err.code ?? err.status);
  console.error("Twitter says:", JSON.stringify(err.data ?? err, null, 2));
}
