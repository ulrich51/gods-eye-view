import { createVoiceCommands as bindVoiceCommands } from './sessionCommands.js';
import { createRealtimeSession } from './realtimeSession.js';
import { createClaudeBrowserSession } from './claudeBrowserSession.js';

// Mission-control fork default: Claude (STT/TTS in-browser, no OpenAI key
// available). Set VITE_VOICE_PROVIDER=openai to revert to the original
// OpenAI Realtime adapter — the single rollback switch for this swap.
// Optional chaining: import.meta.env only exists under Vite's bundler, not
// under the plain Node test runner this repo's unit tests run on — without
// it, importing this module outside Vite throws at import time.
const DEFAULT_SESSION_FACTORY =
  import.meta.env?.VITE_VOICE_PROVIDER === 'openai'
    ? createRealtimeSession
    : createClaudeBrowserSession;

/** Default composition; callers may supply another session adapter factory. */
export function createVoiceCommands(options) {
  return bindVoiceCommands({
    createSession: DEFAULT_SESSION_FACTORY,
    ...options,
  });
}
