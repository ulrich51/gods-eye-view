import { createClaudeConverseHandler } from './claude/converse.js';

/**
 * Vite plugin: Claude turn-based voice conversation endpoint.
 *
 * Keeps ANTHROPIC_API_KEY server-side, same as openAiRealtimeProxy does for
 * OPENAI_API_KEY. This is the mission-control fork's replacement for OpenAI
 * Realtime voice — see src/voice/claudeBrowserSession.js for the browser
 * side (SpeechRecognition + speechSynthesis + the tool-use loop).
 */
function claudeConverseProxy({ annotationGuidance } = {}) {
  function install(middlewares) {
    middlewares.use(
      '/api/claude/converse',
      createClaudeConverseHandler({ annotationGuidance }),
    );
  }

  return {
    name: 'claude-converse-proxy',
    configureServer(server) {
      install(server.middlewares);
    },
    configurePreviewServer(server) {
      install(server.middlewares);
    },
  };
}

export { claudeConverseProxy };
