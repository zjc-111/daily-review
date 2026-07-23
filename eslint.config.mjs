// Standard ESLint config — replaces 妙搭's @lark-apaas/coding-presets
import js from "@eslint/js";

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: {
        console: "readonly",
        process: "readonly",
        Buffer: "readonly",
        localStorage: "readonly",
        fetch: "readonly",
        document: "readonly",
        window: "readonly",
        crypto: "readonly",
        URL: "readonly",
        URLSearchParams: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
      },
    },
    rules: {
      "no-unused-vars": "off", // TypeScript handles this
    },
  },
  {
    ignores: ["node_modules/**", "dist/**", "data/**", "client/src/components/ui/**"],
  },
];
