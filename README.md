# Inspra Extension

A local-first Chrome MV3 extension that captures visual references from the web and turns them into reusable, AI-agent-ready design skills.

> Inspra describes the design signals behind a reference. It is built to support original work, not clone source websites.

## At a glance

| Area | Implementation |
| --- | --- |
| Extension | WXT + Chrome MV3 |
| Interface | React, TypeScript, Tailwind CSS |
| Storage | `chrome.storage.local` |
| Providers | OpenAI-compatible APIs, Ollama, LM Studio, local fallback |
| Privacy | Captures remain local unless the user explicitly generates or submits |

## What is included

- Inspect-style capture workflow for visible web references.
- Local Inspiration Basket backed by `chrome.storage.local`.
- Design-signal extraction and reusable prompt generation.
- Provider settings for local fallback, OpenAI-compatible endpoints, Ollama, and LM Studio.
- Configurable HTTPS feedback endpoint with a privacy-limited payload.
- Release workflow that builds and attaches an unpacked extension ZIP to GitHub releases.

## Privacy model

Captures stay local by default. Reference context leaves the browser only when the user explicitly:

1. clicks **Generate Skill** with a configured provider, or
2. submits release feedback.

The extension does not send captured page URLs, profile state, captured HTML, or provider keys in feedback payloads. It also never connects directly to Neon or PostgreSQL; feedback is routed through a server-side API.

## Development

```bash
npm install
npm run dev
```

Load the generated directory as an unpacked Chrome extension:

```text
apps/extension/.output/chrome-mv3
```

## Checks

```bash
npm run typecheck
npm run build
```

## Build a release ZIP

```bash
npm run release:zip
```

Output:

```text
release/inspra-extension-v0.1.0.zip
```

## Environment

Copy `apps/extension/.env.example` when release overrides are needed:

```env
WXT_FEEDBACK_API_URL="https://inspra.dev/api/feedback"
WXT_CHATGPT_SIGN_IN_URL="https://chatgpt.com/"
```

Do not commit real secrets.

## Repository scope

This public repository contains the extension source. It intentionally excludes:

- landing website source
- database server code and migrations
- Vercel, Neon, or deployment secrets
- generated extension output
- local Playwright traces, videos, and screenshots