// Test cases that should NOT be detected (false positives)

const { exec } = require('child_process');

// Executing with static command
exec('ls -la');

// Dynamic import with validation
const allowedModules = ['module1', 'module2'];
if (allowedModules.includes(moduleName)) {
  require(moduleName);
}

// Using safer alternatives
const { safeEval } = require('safe-eval-lib');
safeEval(userCode);
