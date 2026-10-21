import type { CapacitorConfig } from '@capacitor/cli';

// Store builds ship the bundled web build (dist). Live reload from the Lovable
// sandbox is opt-in only: run with CAP_LIVE_RELOAD=1 (see `npm run cap:live`).
const liveReload = process.env.CAP_LIVE_RELOAD === '1';

const config: CapacitorConfig = {
  appId: 'app.lovable.p9b7b100e3aeb4062a5d70a7173c46989',
  appName: 'YimaProf',
  webDir: 'dist',
  ...(liveReload
    ? {
        server: {
          url: 'https://9b7b100e-3aeb-4062-a5d7-0a7173c46989.lovableproject.com?forceHideBadge=true',
          cleartext: true,
        },
      }
    : {}),
  android: { allowMixedContent: false },
  ios: { contentInset: 'automatic' },
};

export default config;
