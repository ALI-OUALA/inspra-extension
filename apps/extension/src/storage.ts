import type { InspirationCapture, ProviderSettings, SkillOutput } from "@inspra/core";
import { defaultProviderSettings } from "@inspra/core";

const CAPTURES_KEY = "inspra.captures";
const PROVIDER_KEY = "inspra.provider";
const OUTPUT_KEY = "inspra.lastOutput";
const SETUP_KEY = "inspra.setupComplete";
const ONBOARDING_KEY = "inspra.onboardingComplete";
const PROFILE_KEY = "inspra.profile";

export type InspraProfile = {
  name?: string;
  email?: string;
  chatgptConnected?: boolean;
  connectedAt?: string;
};

type StoredValues = {
  [CAPTURES_KEY]?: InspirationCapture[];
  [PROVIDER_KEY]?: ProviderSettings;
  [OUTPUT_KEY]?: SkillOutput;
  [SETUP_KEY]?: boolean;
  [ONBOARDING_KEY]?: boolean;
  [PROFILE_KEY]?: InspraProfile;
};

const area = () => chrome.storage.local;

export async function getCaptures(): Promise<InspirationCapture[]> {
  const result = (await area().get(CAPTURES_KEY)) as StoredValues;
  return result[CAPTURES_KEY] ?? [];
}

export async function setCaptures(captures: InspirationCapture[]) {
  await area().set({ [CAPTURES_KEY]: captures });
}

export async function addCapture(capture: InspirationCapture) {
  const captures = await getCaptures();
  await setCaptures([capture, ...captures]);
}

export async function removeCapture(id: string) {
  const captures = await getCaptures();
  await setCaptures(captures.filter((capture) => capture.id !== id));
}

export async function clearCaptures() {
  await setCaptures([]);
}

export async function getProviderSettings(): Promise<ProviderSettings> {
  const result = (await area().get(PROVIDER_KEY)) as StoredValues;
  return { ...defaultProviderSettings, ...(result[PROVIDER_KEY] ?? {}) };
}

export async function setProviderSettings(settings: ProviderSettings) {
  await area().set({ [PROVIDER_KEY]: settings });
}

export async function getLastOutput(): Promise<SkillOutput | undefined> {
  const result = (await area().get(OUTPUT_KEY)) as StoredValues;
  return result[OUTPUT_KEY];
}

export async function setLastOutput(output: SkillOutput) {
  await area().set({ [OUTPUT_KEY]: output });
}

export async function getSetupComplete(): Promise<boolean> {
  const result = (await area().get(SETUP_KEY)) as StoredValues;
  return Boolean(result[SETUP_KEY]);
}

export async function setSetupComplete(value: boolean) {
  await area().set({ [SETUP_KEY]: value });
}

export async function getOnboardingComplete(): Promise<boolean> {
  const result = (await area().get(ONBOARDING_KEY)) as StoredValues;
  return Boolean(result[ONBOARDING_KEY]);
}

export async function setOnboardingComplete(value: boolean) {
  await area().set({ [ONBOARDING_KEY]: value });
}

export async function getProfile(): Promise<InspraProfile> {
  const result = (await area().get(PROFILE_KEY)) as StoredValues;
  return result[PROFILE_KEY] ?? {};
}

export async function setProfile(profile: InspraProfile) {
  await area().set({ [PROFILE_KEY]: profile });
}
