import {
  createFallbackSkill,
  generatorSystemPrompt,
  type InspirationCapture,
  type ProviderSettings,
  type SkillOutput
} from "@inspra/core";

function compactCapture(capture: InspirationCapture) {
  return {
    sourceUrl: capture.sourceUrl,
    pageTitle: capture.pageTitle,
    kind: capture.kind,
    note: capture.note,
    text: capture.text?.slice(0, 900),
    styleSignals: capture.styleSignals,
    rect: capture.rect
  };
}

export async function generateSkill(
  captures: InspirationCapture[],
  provider: ProviderSettings
): Promise<SkillOutput> {
  if (!captures.length) {
    throw new Error("Capture at least one reference before generating a skill.");
  }

  if (provider.mode === "local" || !provider.apiKey.trim()) {
    return createFallbackSkill(captures);
  }

  const endpoint = `${provider.baseUrl.replace(/\/$/, "")}/chat/completions`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: provider.model,
      temperature: provider.temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: generatorSystemPrompt },
        {
          role: "user",
          content: `Generate JSON with keys shortPrompt, fullSkill, designPrinciples, antiCopyRules, antiSlopRules. Captures:\n${JSON.stringify(
            captures.map(compactCapture),
            null,
            2
          )}`
        }
      ]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Provider request failed: ${response.status} ${errorText.slice(0, 260)}`);
  }

  const data = (await response.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Provider returned no skill content.");

  let parsed: Omit<SkillOutput, "generatedAt">;
  try {
    parsed = JSON.parse(content) as Omit<SkillOutput, "generatedAt">;
  } catch {
    throw new Error("Provider returned malformed JSON. Try again or switch to local draft mode.");
  }
  if (!parsed.shortPrompt || !parsed.fullSkill) {
    throw new Error("Provider response was missing required skill fields.");
  }
  return {
    generatedAt: new Date().toISOString(),
    shortPrompt: parsed.shortPrompt,
    fullSkill: parsed.fullSkill,
    designPrinciples: parsed.designPrinciples ?? [],
    antiCopyRules: parsed.antiCopyRules ?? [],
    antiSlopRules: parsed.antiSlopRules ?? []
  };
}
