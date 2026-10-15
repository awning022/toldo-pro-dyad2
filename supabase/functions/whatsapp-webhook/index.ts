import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GRAPH_VERSION = Deno.env.get("WHATSAPP_GRAPH_VERSION") || "v23.0";
const encoder = new TextEncoder();

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function verifySignature(rawBody: string, signature: string | null, appSecret: string) {
  if (!signature?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", encoder.encode(appSecret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const digest = new Uint8Array(await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody)));
  const hex = [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
  const expected = `sha256=${hex}`;
  if (expected.length !== signature.length) return false;
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

async function sendText(phoneNumberId: string, to: string, text: string, token: string) {
  const response = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ messaging_product: "whatsapp", recipient_type: "individual", to, type: "text", text: { preview_url: false, body: text.slice(0, 3500) } }),
  });
  if (!response.ok) throw new Error(`WhatsApp send failed: ${response.status}`);
}

Deno.serve(async (request) => {
  const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN");
  if (request.method === "GET") {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && verifyToken && token === verifyToken && challenge) {
      return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
    }
    return new Response("Webhook verification failed", { status: 403 });
  }
  if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });

  const rawBody = await request.text();
  const appSecret = Deno.env.get("WHATSAPP_APP_SECRET");
  if (!appSecret || !(await verifySignature(rawBody, request.headers.get("x-hub-signature-256"), appSecret))) {
    return new Response("Invalid signature", { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");
  if (!supabaseUrl || !serviceRole || !accessToken) return json(503, { error: "WhatsApp webhook secrets are not configured" });

  const admin = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
  let payload: any;
  try { payload = JSON.parse(rawBody); } catch { return json(400, { error: "Invalid JSON" }); }

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      if (change.field !== "messages") continue;
      const value = change.value ?? {};
      const phoneNumberId = value.metadata?.phone_number_id;
      if (!phoneNumberId) continue;
      const { data: connection } = await admin.from("whatsapp_connections")
        .select("id,company_id,phone_number_id,status")
        .eq("phone_number_id", phoneNumberId).eq("status", "connected").maybeSingle();
      if (!connection) continue;

      for (const message of value.messages ?? []) {
        if (!message.id || message.type !== "text" || !message.from) continue;
        const text = String(message.text?.body ?? "").trim().slice(0, 4000);
        if (!text) continue;
        const { error: insertError } = await admin.from("whatsapp_message_events").insert({
          connection_id: connection.id, provider_message_id: message.id, sender_phone: message.from,
          message_type: message.type, message_text: text, processing_status: "received",
        });
        if (insertError) {
          if (insertError.code === "23505") continue; // Meta retries must not trigger duplicate actions/replies.
          console.error("Failed to record inbound WhatsApp message", insertError.message);
          continue;
        }

        // Safe foundation: until company-scoped operational tools are implemented and tested,
        // do not pretend to read or modify stock/finance. Only acknowledge and direct the user.
        const reply = "Olá! Sou a IA Toldo Pro. Sua conexão com o WhatsApp foi recebida, mas o atendimento inteligente ainda está em configuração. Por segurança, ainda não executei alterações no estoque nem consultei dados da empresa.";
        try {
          await sendText(phoneNumberId, message.from, reply, accessToken);
          await admin.from("whatsapp_message_events").update({ processing_status: "processed", processed_at: new Date().toISOString() }).eq("provider_message_id", message.id);
        } catch (error) {
          console.error("WhatsApp reply failed", error instanceof Error ? error.message : "unknown error");
          await admin.from("whatsapp_message_events").update({ processing_status: "error" }).eq("provider_message_id", message.id);
        }
      }
    }
  }
  return json(200, { received: true });
});
