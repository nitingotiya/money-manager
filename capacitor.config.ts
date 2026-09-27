import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  // The app's permanent ID on Android. Once the app is published on Google Play this must never change,
  // or Play will treat it as a different app. Change it now if you want your own (e.g. com.yourname.money).
  appId: 'com.nitin.moneymanager',
  appName: 'Money Manager',
  webDir: 'dist',
}

export default config
