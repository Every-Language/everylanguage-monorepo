import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';

// Enable react-native-screens for better performance
enableScreens();

import App from './src/app/App';

// Register the app
registerRootComponent(App);
