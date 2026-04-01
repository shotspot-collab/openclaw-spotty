# Spotty Model Routing Policy

This file is the workspace-local source of truth for Spotty model selection.
It supersedes older Gemini-based routing templates.

## Base policy: Spotty orchestration agent

- Primary: `anthropic/claude-sonnet-4-6`
- Fallbacks: `openai-codex/gpt-5.4-mini` → `mistral/mistral-large-latest`

Use for general orchestration, routing, and context handling.

## Subagent policies

### Coordinator subagents
- Primary: `openai-codex/gpt-5.4`
- Fallbacks: `anthropic/claude-sonnet-4-6` -> `mistral/mistral-large-latest`
- Use for task planning, decomposition, delegation, and summarization.

### Architect subagents
- Primary: `anthropic/claude-sonnet-4-6`
- Fallbacks: `openai-codex/gpt-5.4` → `mistral/mistral-large-latest`
- Use for system design, API structure, schema design, and technical documentation.

### Developer subagents
- Primary: `mistral/devstral-medium-latest`
- Fallbacks: `openai-codex/gpt-5.4-mini` → `anthropic/claude-sonnet-4-6`
- Use for code generation, multi-file edits, API implementation, frontend components, and refactoring.

### QA subagents
- Primary: `openai-codex/gpt-5.4-mini`
- Fallbacks: `openai-codex/gpt-5.4` → `anthropic/claude-sonnet-4-6`
- Use for test generation, diff review, edge-case detection, and validation.

### UX subagents
- Primary: `anthropic/claude-sonnet-4-6`
- Fallbacks: `openai-codex/gpt-5.4-mini` → `mistral/mistral-large-latest`
- Use for UI design reasoning and interaction structure.

### Deploy subagents
- Primary: `openai-codex/gpt-5.4-mini`
- Fallbacks: `openai-codex/gpt-5.4-nano` → `mistral/mistral-large-latest`
- Use for CI/CD steps, migration logic, config updates, and deployment validation.

### Default / uncategorized subagents
- Use Spotty base policy: `anthropic/claude-sonnet-4-6` → `openai-codex/gpt-5.4-mini` → `mistral/mistral-large-latest`

## Global constraints

- Do not use Google/Gemini models in any active chain.
- Do not duplicate the primary model in the fallback list.
- Do not duplicate fallback entries.
- Required allowlist/catalog entries:
  - `openai-codex/gpt-5.4-nano`
  - `openai-codex/gpt-5.4-mini`
  - `anthropic/claude-sonnet-4-6`
  - `mistral/devstral-medium-latest`
  - `mistral/mistral-large-latest`
- Required auth must be available for `anthropic`, `openai-codex`, and `mistral`.
- Keep `tools.profile = coding`.
- Do not explicitly request stale tool entries such as `image_generate`.

## Runtime note

This policy is the target routing behavior for future Spotty spawns and for re-spawned subagents.
Live sessions already running may need to be restarted to pick up the new routing.