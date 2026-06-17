import Constants from "expo-constants";

export const env = {
  supabaseUrl: Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    Constants.expoConfig?.extra?.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  enableAi: Constants.expoConfig?.extra?.EXPO_PUBLIC_ENABLE_AI === "true",
  openAiApiKey: Constants.expoConfig?.extra?.EXPO_PUBLIC_OPENAI_API_KEY ?? "",
};

export const isSupabaseConfigured = () =>
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;
