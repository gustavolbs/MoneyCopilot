module.exports = {
  expo: {
    name: "MoneyCopilot",
    slug: "MoneyCopilot",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/adaptive-icon.png",
    scheme: "moneycopilot",
    userInterfaceStyle: "automatic",
    ios: {
      supportsTablet: true,
      bundleIdentifier: "com.gugabispo99.MoneyCopilot",
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        backgroundColor: "#E6F4FE",
        foregroundImage: "./assets/android-icon-foreground.png",
        backgroundImage: "./assets/android-icon-background.png",
        monochromeImage: "./assets/android-icon-monochrome.png",
      },
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: "./assets/favicon.png",
    },
    plugins: ["expo-router", "expo-sqlite", "expo-secure-store"],
    experiments: {
      typedRoutes: true,
    },
    updates: {
      url: "https://u.expo.dev/05146b73-0bb4-4317-aefb-d3232882cf60",
    },
    runtimeVersion: {
      policy: "appVersion",
    },
    extra: {
      EXPO_PUBLIC_SUPABASE_URL: "https://yhogmascbzzwtiyrbzsn.supabase.co",
      EXPO_PUBLIC_SUPABASE_ANON_KEY:
        "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlob2dtYXNjYnp6d3RpeXJienNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE3MjIwODQsImV4cCI6MjA5NzI5ODA4NH0.Yai3Vgs83e-QavuqMZwo75TCFrDlFAQDhkY490hv47I",
      EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
        "sb_publishable_Et7MSF1c8kVsXILeCONeow_FUpGNz4Y",
      EXPO_PUBLIC_ENABLE_AI: "false",
      router: {},
      eas: {
        projectId: "05146b73-0bb4-4317-aefb-d3232882cf60",
      },
    },
  },
};
