# Secure Feedback Backend

Inspra Extension must not connect directly to Neon/Postgres.

Production flow:

```txt
Extension -> HTTPS feedback API -> Neon/Postgres
```

The extension repository may contain:

- Public API URL: `WXT_FEEDBACK_API_URL`
- Payload types
- Client-side validation

The extension repository must not contain:

- `DATABASE_URL`
- Neon API tokens
- Vercel tokens
- GitHub tokens
- Server-side API source that embeds secrets

Recommended server controls:

- Enforce `POST` only.
- Validate feedback kind and message length.
- Rate-limit by IP/user-agent.
- Store only user-submitted text and minimal diagnostics.
- Keep `DATABASE_URL` in hosting provider environment variables.
- Use CORS allow-list for extension ID and production domains after Chrome Web Store ID exists.
