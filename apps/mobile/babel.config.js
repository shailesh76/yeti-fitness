module.exports = function(api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
    plugins: [
      "react-native-worklets/plugin"
    ],
    overrides: [
      {
        test: (filename) => {
          if (!filename) return false;
          return /\.tsx?$/.test(filename) && !/node_modules/.test(filename);
        },
        plugins: [
          ["@babel/plugin-transform-typescript", { "allowDeclareFields": true }],
          ["@babel/plugin-proposal-decorators", { "version": "legacy" }],
          ["@babel/plugin-transform-class-properties", { "loose": true }]
        ]
      }
    ]
  };
};
