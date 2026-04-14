/**
 * [EXCELLENCE SUMMARY]
 * Defines the static analysis perimeter for the Aegis mobile codebase. 
 * By leveraging the standard Expo flat config, we ensure that code quality 
 * is maintained at a production-grade level across the entire development team.
 * 
 * [DOMAIN LOGIC]
 * Enforces coding patterns that prevent common pitfalls in React Native development, 
 * ensuring the reliability of the insurance platform's mobile interface.
 */

// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/**
 * [IN-LINE PRIDE]: Configurable Quality Gates
 * Configures the ESLint engine to respect build artifacts while enforcing 
 * strict linting rules on all source files.
 */
module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
  },
]);
