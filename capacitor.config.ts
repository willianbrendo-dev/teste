import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.8bcdfb9f8e544647b419e88a58d14c63',
  appName: 'mobile-order-pro',
  webDir: 'dist',
  server: {
    url: 'https://8bcdfb9f-8e54-4647-b419-e88a58d14c63.lovableproject.com?forceHideBadge=true',
    cleartext: true
  },
  android: {
    allowMixedContent: true
  }
};

export default config;
