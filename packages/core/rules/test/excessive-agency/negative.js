// Test cases that should NOT be detected (false positives)

const fs = require('fs');
const { exec, spawn } = require('child_process');

// File deletion with approval
if (await confirm("Delete this file?")) {
  fs.unlinkSync(filePath);
}

// File deletion with user approval
await userApproval("delete-file");
fs.rm(dirPath, { recursive: true });

// Code execution with approval
const approved = await askUser("Execute command?");
if (approved) {
  exec(userCommand);
}

// Network access with URL validation
async function myTool(url) {
  if (isAllowedUrl(url)) {
    const data = await fetch(url);
    return data;
  }
}

// File write with path restriction
if (userPath.startsWith(ALLOWED_DIR)) {
  fs.writeFileSync(userPath, userData);
}

// File write with validation
if (isAllowedPath(userPath)) {
  fs.writeFileSync(userPath, userData);
}
