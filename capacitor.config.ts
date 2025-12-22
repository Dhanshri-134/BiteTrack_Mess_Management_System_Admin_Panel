import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.example.app',
  appName: 'mess-management-frontend',
  webDir: "out",
  "server": {
    "cleartext": true,
    "androidScheme": "https"
  },
  "android": {
    "allowMixedContent": true
  }
};

export default config;
