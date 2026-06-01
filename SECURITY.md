# Security Policy

## Supported Versions

Inspra is pre-1.0. Security fixes target the latest commit on `main`.

## Reporting a Vulnerability

Please do not open public issues for exploitable bugs. Email the maintainer or create a private GitHub security advisory once the repository is public.

Include:

- Affected extension version.
- Reproduction steps.
- Expected and actual behavior.
- Whether data leaves the local browser.

## Privacy Boundaries

Inspra Extension is local-first. Captures stay in `chrome.storage.local` unless the user explicitly generates with a configured provider or submits feedback.

Provider API keys are stored in Chrome local storage on the user's machine. Users can delete a saved key from the Generation panel.

Feedback intentionally sends only the selected feedback type, user-written message, optional reply email, app version, capture count, and provider mode. It does not send captured page URLs, profile state, captured HTML, or provider keys.
