import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { redact, redactPayload } from './redact.js';
import {
  validateAgentResponseSchema,
  sanitizeSpeechField,
} from './guards.js';
import { getFixtureCopy } from './mockFixtures.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROMPTS_DIR = path.resolve(__dirname, '../prompts');

const promptCache = new Map();
const promptAuditLog = [];

export function getPromptAuditLog() {
  return [...promptAuditLog];
}

export function clearPromptAuditLog() {
  promptAuditLog.length = 0;
}

export function getClaudeModelConfig(useFastModel = false) {
  const defaultModel = process.env.CLAUDE_MODEL || 'claude-sonnet-5-5';
  const fastModel = process.env.CLAUDE_MODEL_FAST || 'claude-haiku-5-5';
  return {
    model: useFastModel ? fastModel : defaultModel,
    defaultModel,
    fastModel,
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    mockAi: process.env.MOCK_AI === 'true',
  };
}

export function loadAgentPrompt(agentName) {
  if (promptCache.has(agentName)) {
    return promptCache.get(agentName);
  }
  const promptPath = path.join(PROMPTS_DIR, `${agentName}.md`);
  const content = fs.readFileSync(promptPath, 'utf8');
  promptCache.set(agentName, content);
  return content;
}

function extractJsonObject(rawText = '') {
  const trimmed = String(rawText || '').trim();
  const fencedMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fencedMatch ? fencedMatch[1].trim() : trimmed;
  return JSON.parse(candidate);
}

function withTimeout(promise, timeoutMs) {
  let timer = null;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      const err = new Error(`Claude request timed out after ${timeoutMs}ms`);
      err.code = 'CLAUDE_TIMEOUT';
      reject(err);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function callLiveAnthropicApi({
  apiKey,
  model,
  system,
  userPrompt,
  imageBase64 = null,
  imageMediaType = 'image/jpeg',
}) {
  const contentBlocks = [];
  if (imageBase64) {
    contentBlocks.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: imageMediaType,
        data: imageBase64,
      },
    });
  }
  contentBlocks.push({
    type: 'text',
    text: userPrompt,
  });

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      temperature: 0,
      system,
      messages: [
        {
          role: 'user',
          content: contentBlocks,
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`Anthropic API HTTP ${res.status}: ${errText}`);
    err.code = `ANTHROPIC_HTTP_${res.status}`;
    throw err;
  }

  const body = await res.json();
  const textBlock = (body?.content || []).find((c) => c.type === 'text');
  return textBlock?.text || '';
}

/**
 * Single unified wrapper for all NagarSathi Claude agent calls.
 * - Redacts all inputs (`redactPayload` + `redact`) before constructing the prompt
 * - Uses `CLAUDE_MODEL` (default `claude-sonnet-5-5`) or `CLAUDE_MODEL_FAST` (default `claude-haiku-5-5`)
 * - Enforces strict JSON `{ display, speech, data }` schema + speech rules
 * - Retries ONCE on invalid JSON or schema failure
 * - Enforces request timeout and graceful fallback on failure
 * - Uses `mockBuilder` when `MOCK_AI=true` or when no API key / custom transport is provided
 */
export async function callClaudeAgent({
  agentName,
  language = 'mr-IN',
  input = {},
  useFastModel = false,
  mockBuilder,
  llmTransport = null,
  timeoutMs = 12000,
}) {
  const config = getClaudeModelConfig(useFastModel);
  const systemPrompt = loadAgentPrompt(agentName);

  // Redact all PII before building the user prompt
  const redactedInput = redactPayload(input);
  const baseUserPrompt = redact(
    `Language: ${language}\nAgent: ${agentName}\nInput JSON:\n${JSON.stringify(redactedInput)}\n\nRespond ONLY with valid JSON: {"display": "...", "speech": "...", "data": {...}}`
  );

  promptAuditLog.push({
    timestamp: new Date().toISOString(),
    agentName,
    model: config.model,
    language,
    systemPrompt,
    userPrompt: baseUserPrompt,
    redactedInput,
  });

  const useMock =
    !llmTransport && (config.mockAi || !config.apiKey);

  if (useMock && typeof mockBuilder === 'function') {
    const mockResult = await mockBuilder({
      language,
      input: redactedInput,
      model: config.model,
    });
    return mockResult;
  }

  let lastError = null;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const retrySuffix =
      attempt > 1
        ? '\nIMPORTANT RETRY: Your previous output was not valid JSON or failed schema validation. Return ONLY a raw JSON object {"display":"...","speech":"...","data":{...}} with no symbols or URLs in speech.'
        : '';

    const fullUserPrompt = `${baseUserPrompt}${retrySuffix}`;

    try {
      const rawResponse = await withTimeout(
        llmTransport
          ? Promise.resolve(
              llmTransport({
                agentName,
                model: config.model,
                language,
                system: systemPrompt,
                userPrompt: fullUserPrompt,
                redactedInput,
                attempt,
              })
            )
          : callLiveAnthropicApi({
              apiKey: config.apiKey,
              model: config.model,
              system: systemPrompt,
              userPrompt: fullUserPrompt,
              imageBase64: input?.imageBase64 || null,
              imageMediaType: input?.imageMediaType || 'image/jpeg',
            }),
        timeoutMs
      );

      const parsed =
        typeof rawResponse === 'string'
          ? extractJsonObject(rawResponse)
          : rawResponse;

      if (parsed && typeof parsed.speech === 'string') {
        const initialCheck = validateAgentResponseSchema(parsed);
        if (!initialCheck.valid && initialCheck.reason?.startsWith('SPEECH_')) {
          parsed.speech = sanitizeSpeechField(parsed.speech);
        }
      }

      const validation = validateAgentResponseSchema(parsed);
      if (!validation.valid) {
        const schemaErr = new Error(
          `Schema validation failed (${validation.reason})`
        );
        schemaErr.code = 'INVALID_AGENT_JSON_SCHEMA';
        throw schemaErr;
      }

      return {
        display: parsed.display,
        speech: parsed.speech,
        data: {
          ...parsed.data,
          language,
          modelUsed: config.model,
          attempts: attempt,
        },
      };
    } catch (err) {
      lastError = err;
      if (err.code === 'CLAUDE_TIMEOUT') {
        break;
      }
    }
  }

  // Graceful fallback on API failure, timeout, or 2x invalid JSON
  const fallbackCopy = getFixtureCopy(language, 'fallback');
  return {
    display: fallbackCopy.display,
    speech: fallbackCopy.speech,
    data: {
      fallback: true,
      errorCode: lastError?.code || 'CLAUDE_FALLBACK',
      language,
      modelUsed: config.model,
    },
  };
}

