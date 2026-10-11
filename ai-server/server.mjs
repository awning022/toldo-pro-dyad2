import http from "node:http";
import { timingSafeEqual } from "node:crypto";

const PORT = Number(process.env.PORT || 8080);
const TOKEN = process.env.AI_SERVER_TOKEN || "";
const OLLAMA_URL = (process.env.OLLAMA_URL || "http://ollama:11434").replace(/\/+$/, "");
const MODEL = process.env.OLLAMA_MODEL || "qwen2.5:3b";
const MAX_BODY_BYTES = 128 * 1024;

function safeTokenEqual(received) {
  if (!TOKEN || !received) return false;
  const a = Buffer.from(TOKEN);
  const b = Buffer.from(received);
  return a.length === b.length && timingSafeEqual(a, b);
}
function send(res, status, data) {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
  });
  res.end(JSON.stringify(data));
}
async function readJson(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("BODY_TOO_LARGE");
    chunks.push(chunk);
  }
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}
async function checkOllama() {
  const response = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(3000) });
  if (!response.ok) return false;
  const payload = await response.json();
  return Array.isArray(payload.models) && payload.models.some((item) => item.name === MODEL || item.name?.startsWith(MODEL + ":"));
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", "http://localhost");
  if (req.method === "GET" && url.pathname === "/healthz") {
    return send(res, 200, { ok: true, service: "toldo-pro-ai-gateway" });
  }
  if (req.method !== "POST" || url.pathname !== "/v1/chat") {
    return send(res, 404, { error: "not_found" });
  }
  const auth = req.headers.authorization || "";
  const suppliedToken = auth.startsWith("Bearer ") ? auth.slice(7) : "";
  if (!safeTokenEqual(suppliedToken)) return send(res, 401, { error: "unauthorized" });
  if (!TOKEN || TOKEN.length < 32) return send(res, 503, { error: "AI_SERVER_TOKEN must contain at least 32 characters" });
  if (!req.headers["content-type"]?.includes("application/json")) {
    return send(res, 415, { error: "application_json_required" });
  }

  let input;
  try {
    input = await readJson(req);
  } catch (error) {
    return send(res, error.message === "BODY_TOO_LARGE" ? 413 : 400, { error: "invalid_json_or_body_too_large" });
  }

  if (typeof input.system !== "string" || !Array.isArray(input.messages) || input.messages.length < 1 || input.messages.length > 12) {
    return send(res, 400, { error: "invalid_chat_payload" });
  }
  const messages = input.messages.map((item) => {
    if (!item || !["user", "assistant"].includes(item.role) || typeof item.content !== "string") {
      throw new Error("INVALID_MESSAGE");
    }
    return { role: item.role, content: item.content.slice(0, 8000) };
  });
  if (messages.some((item) => item.content.length > 8000)) {
    return send(res, 400, { error: "message_too_long" });
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        stream: false,
        messages: [{ role: "system", content: input.system.slice(0, 60000) }, ...messages],
        options: {
          temperature: Number.isFinite(input.temperature) ? Math.min(1, Math.max(0, input.temperature)) : 0.35,
          num_predict: Number.isFinite(input.max_tokens) ? Math.min(1200, Math.max(64, input.max_tokens)) : 900,
        },
      }),
      signal: AbortSignal.timeout(85000),
    });
    if (!response.ok) {
      const detail = (await response.text()).slice(0, 300);
      console.error("Ollama returned an error", response.status, detail);
      return send(res, 503, { error: "model_unavailable" });
    }
    const result = await response.json();
    const answer = result?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) return send(res, 502, { error: "empty_model_response" });
    return send(res, 200, { answer: answer.trim(), model: MODEL });
  } catch (error) {
    console.error("Local model request failed", error?.name || "Error", error?.message || "");
    return send(res, 503, { error: "model_unavailable" });
  }
});

if (!TOKEN || TOKEN.length < 32) {
  console.error("Configuration error: AI_SERVER_TOKEN must be set to a random value of at least 32 characters.");
  process.exit(1);
}
server.listen(PORT, "0.0.0.0", () => console.log(`Toldo Pro AI gateway listening on port ${PORT}; model=${MODEL}`));
