import js from "@eslint/js";
import globals from "globals";
import pluginReact from "eslint-plugin-react";

export default [
  // Global ignores
  {
    ignores: [
      "**/node_modules/**",
      "frontend/build/**",
      "**/dist/**",
      "**/*.min.js"
    ]
  },
  // Backend/Scripts JavaScript files
  {
    files: ["backend/**/*.js", "scripts/**/*.js", "*.js"],
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      globals: { ...globals.node }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrors": "none"
      }]
    }
  },
  // Frontend React/JSX files
  {
    files: ["frontend/src/**/*.{js,jsx}"],
    plugins: {
      react: pluginReact
    },
    languageOptions: {
      ecmaVersion: 2024,
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        process: "readonly" // Allow process.env in React apps
      }
    },
    settings: {
      react: {
        version: "detect"
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      ...pluginReact.configs.recommended.rules,
      "react/react-in-jsx-scope": "off", // Not needed in React 18+
      "react/prop-types": "warn", // Warn instead of error for prop-types
      "react/no-unescaped-entities": "warn", // Warn for quotes/apostrophes in JSX
      "no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrors": "none"
      }]
    }
  }
];
