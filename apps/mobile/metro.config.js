const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// 1. Watch all files in the monorepo (so packages/database can be resolved)
config.watchFolders = [workspaceRoot];

// 2. Resolve node_modules from both local and monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// 3. Explicitly map workspace packages to their source so Metro resolves
//    them regardless of whether pnpm symlinks are followed correctly
config.resolver.extraNodeModules = {
  "@yeti/database": path.resolve(workspaceRoot, "packages/database"),
};

// Exclude coach-dashboard Next.js app to prevent watch/ENOENT errors
config.resolver.blockList = [
  /coach-dashboard\/.*/,
];

config.resolver.unstable_enableSymlinks = true;

module.exports = withNativeWind(config, { input: "./global.css" });
