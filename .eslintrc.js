module.exports = {
  extends: ["airbnb", "prettier"],
  plugins: ["import", "react", "prettier", "jsx-a11y"],
  parser: "react-scripts/node_modules/babel-eslint",
  env: {
    browser: true
  },
  settings: {
    "import/resolver": {
      node: {
        paths: ["src"]
      }
    }
  },
  rules: {
    camelcase: "off",
    "no-nested-ternary": "off",
    "import/prefer-default-export": "off",
    "jsx-a11y/interactive-supports-focus": "off",
    "jsx-a11y/click-events-have-key-events": "off",
    "react/button-has-type": "warn",
    "jsx-a11y/media-has-caption": "off",
    "jsx-a11y/label-has-associated-control": "off",
    "no-param-reassign": "off",
    "no-use-before-define": [
      "error",
      { functions: true, classes: true, variables: true }
    ],
    "react/no-this-in-sfc": "warn",
    "no-bitwise": "off",
    "no-console": "off",
    "no-irregular-whitespace": "error",
    "no-unexpected-multiline": "error",
    "no-undef": "error",
    "no-unreachable": "error",
    "no-unused-vars": "warn",
    "no-multiple-empty-lines": [
      "error",
      {
        max: 1,
        maxEOF: 0,
        maxBOF: 0
      }
    ],
    "prettier/prettier": "error",
    "react/jsx-filename-extension": ["off"],
    "react/forbid-prop-types": "off"
  }
};
