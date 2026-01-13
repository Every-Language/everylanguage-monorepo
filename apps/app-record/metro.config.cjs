// Metro configuration for Expo
/* eslint-env node */
/* global __dirname */
const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

module.exports = (async () => {
  const config = await getDefaultConfig(__dirname);
  
  // Add monorepo package to watchFolders for proper hot reloading
  const projectRoot = __dirname;
  const workspaceRoot = path.resolve(projectRoot, '../..');
  
  config.watchFolders = [...(config.watchFolders || []), workspaceRoot];
  
  // Ensure monorepo packages are resolved correctly
  config.resolver = {
    ...config.resolver,
    nodeModulesPaths: [
      path.resolve(projectRoot, 'node_modules'),
      path.resolve(workspaceRoot, 'node_modules'),
    ],
  };
  
  return config;
})();
