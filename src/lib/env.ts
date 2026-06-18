export const env = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabaseAnonKey:
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
    "",
  enableAi: process.env.NEXT_PUBLIC_ENABLE_AI === "true",
  openAiApiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY ?? "",
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, "") ?? "",
};

export const isSupabaseConfigured = () =>
  env.supabaseUrl.length > 0 && env.supabaseAnonKey.length > 0;

export const getAuthRedirectUrl = () => {
  if (env.siteUrl) return `${env.siteUrl}/`;
  if (typeof window !== "undefined") return `${window.location.origin}/`;
  return undefined;
};
