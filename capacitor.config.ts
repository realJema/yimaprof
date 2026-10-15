import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.p9b7b100e3aeb4062a5d70a7173c46989',
  appName: 'yimaprof',
  webDir: 'dist',
  server: {
    // Hot reload: the phone app loads the live sandbox so edits appear instantly.
    // Remove this whole "server" block before building for the stores.
    url: 'https://9b7b100e-3aeb-4062-a5d7-0a7173c46989.lovableproject.com?forceHideBadge=true',
    cleartext: true
  }
};

export default config;
