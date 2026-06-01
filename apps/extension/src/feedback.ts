import type { InspirationCapture, ProviderSettings } from "@inspra/core";
export type FeedbackKind = "bug" | "idea" | "love" | "confusing";

export type FeedbackPayload = {
  kind: FeedbackKind;
  message: string;
  email?: string;
  appVersion: string;
  capturesCount: number;
  providerMode: ProviderSettings["mode"];
};

const DEFAULT_FEEDBACK_ENDPOINT = "https://inspra.dev/api/feedback";

export function getFeedbackEndpoint() {
  return import.meta.env.WXT_FEEDBACK_API_URL || DEFAULT_FEEDBACK_ENDPOINT;
}

export async function submitFeedback(payload: FeedbackPayload) {
  const response = await fetch(getFeedbackEndpoint(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(body?.error ?? "Feedback could not be sent.");
  }

  return body as { ok: true; id?: string };
}

export function createFeedbackPayload(input: {
  kind: FeedbackKind;
  message: string;
  email?: string;
  captures: InspirationCapture[];
  provider: ProviderSettings;
}): FeedbackPayload {
  return {
    kind: input.kind,
    message: input.message.trim(),
    email: input.email?.trim() || undefined,
    appVersion: "0.1.0",
    capturesCount: input.captures.length,
    providerMode: input.provider.mode
  };
}
