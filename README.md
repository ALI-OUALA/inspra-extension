# Inspra Extension

Inspra Extension is a local-first Chrome MV3 extension for turning web inspiration into reusable AI-agent-ready design skills.

It captures visible references, extracts design signals, and generates prompts that describe taste without cloning source websites.

Public repository: extension source only. Website, database migrations, and hosted backend code live outside this repo.

## What Is Included

- Chrome MV3 extension built with WXT, React, TypeScript, and Tailwind.
- Local Inspiration Basket using `chrome.storage.local`.
- Provider settings for local fallback, OpenAI-compatible endpoints, Ollama, and LM Studio.
- Feedback submission through a configurable HTTPS API endpoint. Feedback payloads exclude captured page URLs, profile state, captured HTML, and provider keys.
- Release workflow that builds and attaches the unpacked extension ZIP to GitHub releases.

## What Is Not Included

- Landing website source.
- Database server code.
- Vercel, Neon, or deployment secrets.
- Built extension output.
- Local Playwright traces, videos, or screenshots.

## Privacy And Security

Captures stay local by default. Reference context leaves the browser only when the user explicitly clicks **Generate Skill** with a configured provider, or submits release feedback.

The extension never connects directly to Neon/Postgres. Feedback goes through `WXT_FEEDBACK_API_URL`, which should point to a server-side API that owns `DATABASE_URL`.

## Development

```bash
npm install
npm run dev
```

Load the generated WXT directory in Chrome:

```txt
apps/extension/.output/chrome-mv3
```

## Checks

```bash
npm run typecheck
npm run build
```

## Package Release ZIP

```bash
npm run release:zip
```

The ZIP is written to:

```txt
release/inspra-extension-v0.1.0.zip
```

## Environment

Copy `apps/extension/.env.example` when you need release overrides:

```env
WXT_FEEDBACK_API_URL="https://inspra.dev/api/feedback"
WXT_CHATGPT_SIGN_IN_URL="https://chatgpt.com/"
```

Do not commit real secrets.
