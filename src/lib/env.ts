export const env = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  enableAi: process.env.EXPO_PUBLIC_ENABLE_AI === "true",
  openAiApiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
};

export const isSupabaseConfigured = () =>
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
