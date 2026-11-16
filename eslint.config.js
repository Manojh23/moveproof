import js from "@eslint/js";
import globals from "globals";
import react from "eslint-plugin-react";
import hooks from "eslint-plugin-react-hooks";

export default [
  { ignores: ["**/dist/**", "**/.vercel/**"] },
  js.configs.recommended,
  {
    files: [
      "*.js",
      "api/**/*.js",
      "backend/**/*.js",
      "frontend/vite.config.js",
    ],
    languageOptions: { globals: globals.node },
  },
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
    plugins: { react, "react-hooks": hooks },
    settings: { react: { version: "detect" } },
    rules: {
      ...react.configs.recommended.rules,
      ...react.configs["jsx-runtime"].rules,
      ...hooks.configs.recommended.rules,
    },
  },
];
