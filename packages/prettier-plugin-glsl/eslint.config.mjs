import eslint from "@eslint/js"
import tseslint from "typescript-eslint"
import eslintConfigPrettier from "eslint-config-prettier"
import importPlugin from "eslint-plugin-import"
import cflintRaw from "eslint-plugin-cflint"

// eslint-plugin-cflint exports old-style rule functions; wrap for flat config
const cflint = {
  rules: Object.fromEntries(
    Object.entries(cflintRaw.rules).map(([name, fn]) => [
      name,
      { create: fn },
    ]),
  ),
}

export default tseslint.config(
  {
    ignores: ["out/", "dist/", "lib/", "**/*.d.ts"],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  eslintConfigPrettier,
  {
    files: ["src/**/*.ts"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      import: importPlugin,
      cflint,
    },
    rules: {
      curly: "warn",
      eqeqeq: "warn",
      "no-throw-literal": "warn",
      semi: "off",
      "import/order": "warn",
      yoda: "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/member-ordering": "warn",
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/no-namespace": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/restrict-plus-operands": "off",
      "@typescript-eslint/explicit-member-accessibility": "warn",
      "cflint/no-substr": "error",
      "cflint/no-this-assignment": "error",
    },
  },
)
