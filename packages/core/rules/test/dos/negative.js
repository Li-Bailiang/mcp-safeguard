// Test cases that should NOT be detected (false positives)

const fs = require('fs');

// Loop with break condition
while (true) {
  if (shouldStop()) {
    break;
  }
  processData();
}

// Recursion with depth limit
function factorial(n, depth = 0) {
  if (depth > MAX_DEPTH) throw new Error("Max depth");
  if (n <= 1) return 1;
  return n * factorial(n - 1, depth + 1);
}

// File reading with size check
const stats = fs.statSync(userFilePath);
if (stats.size < MAX_FILE_SIZE) {
  const data = fs.readFileSync(userFilePath);
}

// Safe regex
const pattern = /[a-z]+/;
pattern.test(userInput);

// Memory allocation with limit
const size = Math.min(userSize, MAX_SIZE);
const arr = new Array(size);
