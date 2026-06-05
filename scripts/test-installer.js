#!/usr/bin/env node

/**
 * Test script to verify Semgrep auto-installer functionality
 */

import { SemgrepInstaller } from '../packages/semgrep-installer/dist/index.js';

async function testInstaller() {
  console.log('=== Testing Semgrep Auto-Installer ===\n');

  const installer = new SemgrepInstaller();

  // Test 1: Check availability
  console.log('Test 1: Checking if Semgrep is available...');
  const isAvailable = await installer.isSemgrepAvailable();
  console.log(`  Result: ${isAvailable ? '✓ Available' : '✗ Not available'}\n`);

  // Test 2: Get path
  console.log('Test 2: Getting Semgrep path...');
  const path = await installer.getSemgrepPath();
  console.log(`  Result: ${path || 'null'}\n`);

  // Test 3: Check installation
  if (!isAvailable) {
    console.log('Test 3: Installing Semgrep...');
    const result = await installer.install({
      silent: false,
      fallbackToPip: true
    });

    console.log('\nInstallation Result:');
    console.log(`  Success: ${result.success}`);
    console.log(`  Path: ${result.path}`);
    console.log(`  Method: ${result.method}`);
    console.log(`  Version: ${result.version || 'unknown'}`);

    if (!result.success) {
      console.error(`  Error: ${result.error}`);
      process.exit(1);
    }
  } else {
    console.log('Test 3: Semgrep already installed, checking details...');
    const result = await installer.install({ force: false });
    console.log(`  Path: ${result.path}`);
    console.log(`  Method: ${result.method}`);
    console.log(`  Version: ${result.version || 'unknown'}`);
  }

  console.log('\n✓ All tests passed!\n');
}

testInstaller().catch((error) => {
  console.error('\n✗ Test failed:', error.message);
  process.exit(1);
});
