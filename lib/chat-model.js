export function chatProvider() {
  return process.env.CHAT_PROVIDER || "gemini";
}

export async function shopaiAnswer(instructions, input) {
  const key = process.env.LIBRARY_SHOPAI_API_KEY;
  const model = process.env.SHOPAI_MODEL;
  if (!key || !model) throw new Error("SHOPAI_UNCONFIGURED");
  const base = process.env.SHOPAI_BASE_URL || "https://shopaipro.tech/v1";
  const url = new URL(`${base.replace(/\/$/, "")}/chat/completions`);
  if (url.protocol !== "https:") throw new Error("SHOPAI_HTTPS_REQUIRED");
  const response = await fetch(url, {
    method: "POST",
    redirect: "error",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: instructions },
        { role: "user", content: input },
      ],
      stream: false,
      max_tokens: 1200,
    }),
    signal: AbortSignal.timeout(22000),
  });
  if (!response.ok) throw new Error(`SHOPAI_${response.status}`);
  const result = await response.json();
  const choice = result.choices?.[0];
  if (result.error || (choice?.finish_reason && choice.finish_reason !== "stop"))
    throw new Error("SHOPAI_INCOMPLETE_RESPONSE");
  const content = choice?.message?.role === "assistant" ? choice.message.content : null;
  const answer = typeof content === "string" ? content.trim() : "";
  if (!answer) throw new Error("EMPTY_RESPONSE");
  return answer;
}
