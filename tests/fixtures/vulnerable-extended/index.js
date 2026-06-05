// Vulnerable test fixture
const { exec } = require('child_process');

// Dangerous: Command injection
function runCommand(userInput) {
  exec(`ls ${userInput}`, (error, stdout) => {
    console.log(stdout);
  });
}

// Dangerous: eval usage
function evaluateCode(code) {
  eval(code);
}

// Dangerous: vm.runInNewContext
const vm = require('vm');
function runUntrustedCode(code) {
  vm.runInNewContext(code, {});
}

// Missing authentication
const server = {
  connect: () => console.log('Connected without auth')
};

// Hardcoded credentials
const API_KEY = "EXAMPLE_API_KEY_DO_NOT_USE";
const PASSWORD = "admin123";

// Destructive action without confirmation
const fs = require('fs');
function deleteFile(path) {
  fs.unlinkSync(path);
}

// Unrestricted network access
async function fetchData(url) {
  const response = await fetch(url);
  return response.text();
}

// Path traversal vulnerability
function readUserFile(filename) {
  return fs.readFileSync(filename, 'utf-8');
}

// Environment exposure
function getConfig() {
  return process.env;
}

// Unbounded loop
function processForever() {
  while (true) {
    // Do something
  }
}

// SQL injection
function queryUser(username) {
  const query = "SELECT * FROM users WHERE name = '" + username + "'";
  return db.query(query);
}

module.exports = {
  runCommand,
  evaluateCode,
  deleteFile,
  fetchData,
  readUserFile,
  getConfig
};
