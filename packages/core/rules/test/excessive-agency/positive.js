// Test cases that SHOULD be detected by excessive-agency rules

const fs = require('fs');
const { exec, spawn } = require('child_process');

// mcp-automatic-file-deletion - should detect
fs.unlinkSync(filePath);
fs.rm(dirPath, { recursive: true });

// mcp-automatic-code-execution - should detect
exec(userCommand);
spawn(userCommand);

// mcp-unrestricted-network-access - should detect
async function myTool(url) {
  const data = await fetch(url);
  return data;
}

// mcp-unrestricted-file-write - should detect
fs.writeFileSync(userPath, userData);
