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
      rules: {
        "react/react-in-jsx-scope": "off", // Next.js does not require React to be in scope
        "no-unused-vars": "warn", // Warn about unused variables
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }], // Allow unused variables prefixed with _
      },
    }
  ),
];

export default eslintConfig;
