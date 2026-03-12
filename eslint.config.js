import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import globals from "globals";
import prettierConfig from "eslint-config-prettier";

export default defineConfig([
  js.configs.recommended,
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "vendor/**",
      "tmp/**",
      "log/**",
      "storage/**",
      "public/assets/**",
      "app/assets/builds/**",
      ".devenv/**",
    ],
  },
  {
    name: "config-files",
    files: ["*.config.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    name: "pathogen-javascript",
    files: ["app/assets/javascripts/**/*.js", "test/javascript/**/*.js"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        ...globals.browser,
        ...globals.node,
        Turbo: "readonly",
      },
    },
    rules: {
      "no-console": ["warn", { allow: ["error", "warn"] }],
      "no-var": "error",
      "no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
      "prefer-const": "error",
    },
  },
  prettierConfig,
]);
