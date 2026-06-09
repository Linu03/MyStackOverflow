import OpenAI from 'openai/index.mjs';

const PROVIDER = process.env.LLM_PROVIDER || 'groq';
const isOllama = PROVIDER === 'ollama';
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';

if (!isOllama && !process.env.GROQ_API_KEY) {
  console.error('GROQ_API_KEY is not set (required when LLM_PROVIDER=groq)');
  process.exit(1);
}

export const llm = new OpenAI(
  isOllama
    ? {
        baseURL: `${OLLAMA_URL}/v1`,
        apiKey: 'ollama',
      }
    : {
        baseURL: 'https://api.groq.com/openai/v1',
        apiKey: process.env.GROQ_API_KEY,
      }
);

export const MODEL = isOllama
  ? (process.env.OLLAMA_MODEL || 'qwen3.5:0.8b')
  : (process.env.GROQ_MODEL || 'llama-3.1-8b-instant');

export { PROVIDER };

export function sysMsg(text) {
  if (isOllama) {
    return { role: 'system', content: text };
  }
  return {
    role: 'system',
    content: [{ type: 'text', text, cache_control: { type: 'ephemeral' } }],
  };
}

export async function chatComplete({ messages, temperature = 0.2, max_tokens = 100 }) {
  if (isOllama) {
    const res = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        think: false,
        messages,
        stream: false,
        options: { temperature, num_predict: max_tokens },
      }),
    });
    if (!res.ok) {
      const err = new Error(`ollama chat returned ${res.status}`);
      err.status = res.status;
      throw err;
    }
    const data = await res.json();
    return data.message?.content ?? '';
  }

  const completion = await llm.chat.completions.create({
    model: MODEL,
    messages,
    response_format: { type: 'json_object' },
    temperature,
    max_tokens,
  });
  return completion.choices[0].message.content;
}

function extractQuotedValues(text) {
  return [...text.matchAll(/"([a-z][a-z0-9-]*)"/gi)].map((m) => m[1]);
}

export function parseJsonContent(text) {
  if (!text?.trim()) throw new Error('Empty LLM response');
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = (fenced?.[1] ?? text).trim();

  try {
    return JSON.parse(raw);
  } catch {
    const objectMatch = raw.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try {
        return JSON.parse(objectMatch[0]);
      } catch {
        const values = extractQuotedValues(objectMatch[0]);
        if (values.length > 0) return { tags: values };
      }
    }

    const values = extractQuotedValues(raw);
    if (values.length > 0) return { tags: values };
    throw new Error('Invalid JSON in LLM response');
  }
}
