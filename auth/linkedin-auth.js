/**
 * One-time LinkedIn OAuth 2.0 authorization script.
 * Run once: node auth/linkedin-auth.js
 * Writes LINKEDIN_ACCESS_TOKEN and LINKEDIN_PERSON_URN to .env
 */

import http from "http";
import fs from "fs";
import path from "path";
import { exec } from "child_process";
import { fileURLToPath } from "url";
import crypto from "crypto";
import "dotenv/config";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ENV_PATH = path.resolve(__dirname, "../.env");

const REDIRECT_URI = "http://localhost:3000/callback";
const SCOPES = "openid profile email w_member_social";

function openBrowser(url) {
  const platform = process.platform;
  const cmd =
    platform === "darwin" ? `open "${url}"` :
    platform === "win32" ? `start "" "${url}"` :
    `xdg-open "${url}"`;
  exec(cmd, (err) => {
    if (err) console.warn(`[LinkedIn Auth] Could not open browser automatically. Open this URL manually:\n${url}`);
  });
}

function startCallbackServer(expectedState) {
  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      const reqUrl = new URL(req.url, "http://localhost:3000");
      if (reqUrl.pathname !== "/callback") {
        res.writeHead(404);
        res.end("Not found");
        return;
      }

      const code = reqUrl.searchParams.get("code");
      const state = reqUrl.searchParams.get("state");
      const error = reqUrl.searchParams.get("error");

      if (error) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end(`<h2>Authorization failed: ${error}</h2><p>You can close this tab.</p>`);
        server.close();
        return reject(new Error(`LinkedIn authorization denied: ${error}`));
      }

      if (state !== expectedState) {
        res.writeHead(400, { "Content-Type": "text/html" });
        res.end("<h2>State mismatch. Possible CSRF attack.</h2>");
        server.close();
        return reject(new Error("State parameter mismatch"));
      }

      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(`
        <html><body style="font-family:sans-serif;text-align:center;padding:60px">
          <h2>✅ LinkedIn Authorization Complete</h2>
          <p>You can close this tab and return to your terminal.</p>
        </body></html>
      `);
      server.close();
      resolve(code);
    });

    server.listen(3000, () => {
      console.log("[LinkedIn Auth] Callback server listening on http://localhost:3000");
    });

    server.on("error", reject);
  });
}

async function exchangeCode(code) {
  const params = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: REDIRECT_URI,
    client_id: process.env.LINKEDIN_CLIENT_ID,
    client_secret: process.env.LINKEDIN_CLIENT_SECRET,
  });

  const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString(),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${body}`);
  }

  const data = await res.json();
  console.log(`[LinkedIn Auth] Access token obtained (expires in ${data.expires_in}s)`);
  return data.access_token;
}

async function fetchPersonUrn(accessToken) {
  const res = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "LinkedIn-Version": "202503",
    },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to fetch user info (${res.status}): ${body}`);
  }

  const data = await res.json();
  const urn = `urn:li:person:${data.sub}`;
  console.log(`[LinkedIn Auth] Person URN: ${urn} (${data.name ?? data.sub})`);
  return urn;
}

function updateEnvFile(accessToken, personUrn) {
  let content = fs.readFileSync(ENV_PATH, "utf8");

  const setOrAppend = (key, value) => {
    const regex = new RegExp(`^${key}=.*$`, "m");
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content = content.trimEnd() + `\n${key}=${value}\n`;
    }
  };

  setOrAppend("LINKEDIN_ACCESS_TOKEN", accessToken);
  setOrAppend("LINKEDIN_PERSON_URN", personUrn);

  fs.writeFileSync(ENV_PATH, content, "utf8");
  console.log(`[LinkedIn Auth] .env updated with access token and person URN`);
}

async function main() {
  if (!process.env.LINKEDIN_CLIENT_ID || process.env.LINKEDIN_CLIENT_ID === "your_client_id_here") {
    throw new Error("LINKEDIN_CLIENT_ID is not set in .env. Fill it in from the LinkedIn Developer Portal.");
  }
  if (!process.env.LINKEDIN_CLIENT_SECRET || process.env.LINKEDIN_CLIENT_SECRET === "your_client_secret_here") {
    throw new Error("LINKEDIN_CLIENT_SECRET is not set in .env. Fill it in from the LinkedIn Developer Portal.");
  }

  const state = crypto.randomBytes(16).toString("hex");

  const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", process.env.LINKEDIN_CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPES);
  authUrl.searchParams.set("state", state);

  console.log("[LinkedIn Auth] Opening browser for authorization...");
  console.log(`[LinkedIn Auth] URL: ${authUrl.toString()}`);
  openBrowser(authUrl.toString());

  const code = await startCallbackServer(state);
  console.log("[LinkedIn Auth] Authorization code received");

  const accessToken = await exchangeCode(code);
  const personUrn = await fetchPersonUrn(accessToken);

  updateEnvFile(accessToken, personUrn);
  console.log("[LinkedIn Auth] Done. You can now run: node index.js --test");
}

main().catch((err) => {
  console.error(`[LinkedIn Auth] Error:`, err.message);
  process.exit(1);
});
