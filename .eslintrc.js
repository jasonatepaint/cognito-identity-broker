module.exports = {
  "ignorePatterns": [
    "**/src/auth-portal-api/deploy/**",
    "**/dist/**",
  ],
  "env": {
    "commonjs": true,
    "es6": true,
    "node": true,
    "jest": true
  },
  "parserOptions": {
    "ecmaVersion": 2022,
    "sourceType": "module"
  },
  "rules": {
    "eol-last": "off",
    "brace-style": "off",
    "comma-dangle": "off",
    "comma-spacing": "off",
    "eqeqeq": "off",
    "indent": "off",
    "key-spacing": "off",
    "keyword-spacing": "off",
    "max-len": "off",
    "no-ex-assign": "off",
    "no-extra-boolean-cast": "off",
    "no-multi-spaces": "off",
    "no-throw-literal": "off",
    "no-unreachable": "off",
    "radix": "off",
    "quote-props": "off",
    "quotes": "off",
    "space-before-function-paren": "off",
    "space-in-parens": "off",
    "space-infix-ops": "off",
    "space-unary-ops": "off",
    "spaced-comment": "off"
  },
  "overrides": [
    {
      "extends": ["plugin:@typescript-eslint/recommended", "prettier"],
      "files": ["**/*.ts"],
      "parser": "@typescript-eslint/parser",
      "rules": {
        "@typescript-eslint/no-explicit-any": "off",
        "@typescript-eslint/no-var-requires": "off",
        "@typescript-eslint/ban-ts-comment": "off",
      }
    },
    {
      "files": ["**/*.test.js", "**/*.test.ts"],
      "env": { "jest": true },
      "rules": {
        "@typescript-eslint/no-non-null-asserted-optional-chain": "off",
        "@typescript-eslint/no-unused-vars": "off",
        "prefer-const": "off"
      }
    }
  ]
};
