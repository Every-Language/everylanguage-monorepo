// Metro configuration for Expo
/* eslint-env node */
/* global __dirname */
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  return config;
})();
