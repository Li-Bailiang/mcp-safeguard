// Test cases that SHOULD be detected by supply-chain rules

const { exec, execSync } = require('child_process');
const vm = require('vm');

// mcp-suspicious-exec-package - should detect
exec(userCommand);
execSync(userInput);

// mcp-suspicious-eval - should detect
eval(userCode);

// mcp-suspicious-vm-runInNewContext - should detect
vm.runInNewContext(untrustedCode);

// mcp-dynamic-import - should detect
require(userModule);
import(userPackage);
