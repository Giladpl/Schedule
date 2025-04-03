/**
 * This file helps test that debugging is properly configured.
 * You can set a breakpoint on the line inside debugTest function.
 */

export function debugTest() {
  const testVar = "Debugger is working!"; // Set a breakpoint on this line
  console.log(testVar);
  return testVar;
}

// Add this to your server/index.ts:
// import { debugTest } from './debug-test';
// debugTest();
