interface ImportMetaEnv {
  readonly WXT_FEEDBACK_API_URL?: string;
  readonly WXT_CHATGPT_SIGN_IN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
