import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.crud.template',
  appName: 'CRUDTemplate',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  }
};

export default config;
