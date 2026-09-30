import { createActionTools } from '../../../src/voice/actionSchemas.js';
import { ACTION_DESCRIPTIONS } from '../openai/toolDescriptions.js';

/**
 * Anthropic's Messages API tool format differs from OpenAI's only in shape
 * (name/description/input_schema vs type:function + name/description/
 * parameters) — the underlying schemas and prose come straight from the
 * provider-neutral actionSchemas.js + the existing OpenAI-authored
 * descriptions, so there is exactly one place to edit tool wording.
 */
const OPENAI_SHAPED_TOOLS = createActionTools(ACTION_DESCRIPTIONS);

export const CLAUDE_TOOLS = OPENAI_SHAPED_TOOLS.map(
  ({ name, description, parameters }) => ({
    name,
    description,
    input_schema: parameters,
  }),
);
