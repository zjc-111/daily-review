import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dailyreview.app",
  appName: "Daily Review",
  webDir: "dist/client",
  server: {
    // Dev mode: connect to Vite dev server on PC
    // Comment out for production build
    // url: "http://192.168.2.5:5173",
    // cleartext: true,
  },
  android: {
    allowMixedContent: true,
  },
  ios: {
    contentInset: "automatic",
  },
};

export default config;
