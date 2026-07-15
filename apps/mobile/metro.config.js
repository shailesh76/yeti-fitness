const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so packages/database and packages/training-engine can be resolved)
config.watchFolders = [workspaceRoot];

// 2. Resolve node_modules from both local and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Exclude coach-dashboard Next.js app to prevent watch/ENOENT errors
config.resolver.blockList = [
  /coach-dashboard\/.*/,
];

module.exports = withNativeWind(config, { input: "./global.css" });
