import { realtimeInstructions } from '../openai/instructions.js';

/**
 * Claude drives the app through a turn-based Messages API loop (unlike
 * OpenAI Realtime's continuous audio session), so almost every behavioral
 * rule in realtimeInstructions() still applies verbatim — it is about WHAT
 * to call and WHEN, not about audio timing. Only the turn-structure note is
 * appended, since "do not speak in the same response as the tool call" reads
 * as an audio-overlap instruction; the client here only ever speaks Claude's
 * text content blocks (never tool_use blocks), so the practical effect is
 * the same without needing to rewrite the whole instruction set.
 */
function claudeInstructions(annotationGuidance) {
  return (
    realtimeInstructions(annotationGuidance) +
    '\nYou work in turns: a turn may contain tool_use blocks, text, or both. ' +
    'When a request needs a tool call, prefer returning ONLY tool_use blocks ' +
    'first and save your spoken confirmation for the next turn, after you ' +
    'have the tool result — do not narrate what you are about to do before ' +
    'the result comes back.'
  );
}

export { claudeInstructions };
