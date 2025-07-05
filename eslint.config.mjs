import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({ baseDirectory: __dirname });

const eslintConfig = [
  ...compat.config({
    parser: "@typescript-eslint/parser",
    extends: ["plugin:prettier/recommended"],
    plugins: ["@typescript-eslint", "prettier"],
    rules: {
      "prettier/prettier": [
        "error",
        {
          trailingComma: "all",
          semi: true,
          tabWidth: 2,
          singleQuote: false,
          printWidth: 120,
          endOfLine: "auto",
          arrowParens: "always",
        },
        {
          usePrettierrc: false,
        },
      ],
    },
    ignorePatterns: [
      "node_modules/",
      "*.d.ts",
    ],
  }),
]

export default eslintConfig;