const path = require('node:path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
const app = path.join(__dirname, 'App.js');
const stage2Home = path.join(__dirname, 'screens', 'Stage2Home.js');

// Use the feature screen at the existing post-login entry point.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (context.originModulePath === app && moduleName === './screens/Home') {
    return {type: 'sourceFile', filePath: stage2Home};
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;