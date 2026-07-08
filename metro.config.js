const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// Exclude coach-dashboard Next.js app to prevent watch/ENOENT errors
config.resolver.blockList = [
  /coach-dashboard\/.*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
