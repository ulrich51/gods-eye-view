import { enforceOptInRateLimit, claudeRateLimiter } from './rate-limit.js';
import { readRequestBody } from '../common/request.js';
import { claudeInstructions } from './instructions.js';
import { CLAUDE_TOOLS } from './tools.js';

const ANTHROPIC_MODEL_DEFAULT = 'claude-sonnet-5';
const ANTHROPIC_MAX_TOKENS_DEFAULT = 1024;
const ANTHROPIC_VERSION = '2023-06-01';

/**
 * Turn-based counterpart to openai/realtime.js's ephemeral-token mint: since
 * Claude has no voice-to-voice Realtime equivalent, the browser drives STT
 * (SpeechRecognition) and TTS (speechSynthesis) itself and calls this route
 * once per conversational turn with the full running `messages` array (the
 * client owns history — this route is stateless). Keeps ANTHROPIC_API_KEY
 * server-side, exactly like OPENAI_API_KEY never reaches the browser today.
 */
function createClaudeConverseHandler({
  endpoint = 'https://api.anthropic.com/v1/messages',
  fetchImpl = (...args) => fetch(...args),
  resolveApiKey = () => process.env.ANTHROPIC_API_KEY,
  annotationGuidance,
} = {}) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') {
      res.statusCode = 405;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Method not allowed' }));
      return;
    }

    const apiKey = resolveApiKey();
    if (!apiKey) {
      // Mirrors realtime.js's 503 for a missing OPENAI_API_KEY — the client
      // shows the mic button in a disabled "KEY REQUIRED" state on this,
      // same convention as the FIRMS/TomTom keyless layers.
      res.statusCode = 503;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'ANTHROPIC_API_KEY is not set' }));
      return;
    }

    if (!enforceOptInRateLimit(claudeRateLimiter(), req, res)) return;

    let messages;
    try {
      const body = await readRequestBody(req, 256 * 1024);
      const parsed = JSON.parse(body || '{}');
      if (!Array.isArray(parsed.messages) || parsed.messages.length === 0) {
        throw new Error('messages must be a non-empty array');
      }
      messages = parsed.messages;
    } catch {
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Invalid request body' }));
      return;
    }

    try {
      const response = await fetchImpl(endpoint, {
        method: 'POST',
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': ANTHROPIC_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: process.env.ANTHROPIC_MODEL || ANTHROPIC_MODEL_DEFAULT,
          max_tokens:
            Number(process.env.ANTHROPIC_MAX_TOKENS) ||
            ANTHROPIC_MAX_TOKENS_DEFAULT,
          system: claudeInstructions(annotationGuidance),
          tools: CLAUDE_TOOLS,
          messages,
        }),
      });
      if (!response.ok) {
        console.warn(`[claude-converse] upstream HTTP ${response.status}`);
        res.statusCode = response.status;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        // Never relay Anthropic's own error body verbatim (request ids, org
        // hints) — same caution as hud-summary.js.
        res.end(JSON.stringify({ error: 'Claude request failed' }));
        return;
      }
      const data = await response.json();
      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(
        JSON.stringify({
          content: data.content,
          stop_reason: data.stop_reason,
        }),
      );
    } catch {
      console.warn('[claude-converse] request failed');
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Claude request failed' }));
    }
  };
}

export { createClaudeConverseHandler };
