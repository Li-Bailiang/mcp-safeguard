// Test cases that SHOULD be detected by DOS rules

// mcp-unbounded-loop - should detect
while (true) {
  processData();
}

for (;;) {
  handleRequest();
}

// mcp-uncontrolled-recursion - should detect
function factorial(n) {
  return n * factorial(n - 1);
}

// mcp-large-file-processing - should detect
const fs = require('fs');
const data = fs.readFileSync(userFilePath);

// mcp-regex-dos - should detect
const pattern = /(.+)+/;
pattern.test(userInput);

// mcp-uncontrolled-memory-allocation - should detect
const arr = new Array(userSize);
const buf = Buffer.alloc(userSize);
