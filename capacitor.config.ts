import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.mouse.app',
  appName: 'Mouse',
  webDir: 'dist',
  // Native fetch patch: GitHub OAuth/API do not allow capacitor:// origins in CORS.
  // Without this, device flow and api.github.com calls fail in iOS/Android WebViews.
  plugins: {
    CapacitorHttp: {
      enabled: true,
    },
  },
};

export default config;
