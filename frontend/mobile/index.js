/**
 * [EXCELLENCE SUMMARY]
 * The absolute entry point of the Aegis Mobile application. This file is architected 
 * to handle mission-critical polyfilling and environment stabilization before any 
 * reactive components or logistics logic are initialized. 
 * 
 * [DOMAIN LOGIC]
 * By utilizing CommonJS 'require', we bypass ES module hoisting, ensuring that the 
 * TextDecoder/TextEncoder polyfills are registered globally before binary-heavy 
 * libraries like h3-js are even parsed by the Hermes engine.
 */

const { polyfillGlobal } = require('react-native/Libraries/Utilities/PolyfillFunctions');
const { TextDecoder, TextEncoder } = require('fast-text-encoding');

// 🚨 PRIORITY 0: Standardize encoding before any app code execution
polyfillGlobal('TextDecoder', () => TextDecoder);
polyfillGlobal('TextEncoder', () => TextEncoder);

// Initialize the Expo root component
const { default: registerRootComponent } = require('expo/src/launch/registerRootComponent');
const { default: App } = require('./App');

registerRootComponent(App);
