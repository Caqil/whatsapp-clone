import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript",
    {
      files: ["**/*.ts", "**/*.tsx"],
      rules: {
        "@next/next/no-html-link-for-pages": "off",
        "@next/next/no-img-element": "off",
        "@typescript-eslint/no-unused-vars": [
          "warn",
          {
            argsIgnorePattern: "^_",
            varsIgnorePattern: "^_",
          },
        ],
        "no-unused-vars": "off", // Disable the base rule as it can conflict with TypeScript's rule
      },
    }
  ),
];

export default eslintConfig;
