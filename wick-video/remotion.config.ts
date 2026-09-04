import { Config } from "@remotion/cli/config";
Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
// 9:16 Instagram Reel. Concurrency capped so a render never starves the
// content pipeline running alongside it on the same Mac.
Config.setConcurrency(4);
