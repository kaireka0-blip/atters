import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.weddfin.app',
  appName: 'Attera Visual',
  webDir: 'dist',
  server: {
    url: 'https://damorapictures.netlify.app',
    cleartext: false
  }
};

export default config;
