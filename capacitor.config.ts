import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.shristech.bitetrackadmin',
  appName: 'mess-management-frontend',
  webDir: 'out',
  server: {
    androidScheme: 'https',
  },
  android:{
    allowMixedContent:true,
    
  },
  plugins: {
  Camera: {
    permissions: ["camera"],
  },
}

};

export default config;
