// Safe test fixture
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

// Safe: Using execFile instead of exec
async function runCommand(args) {
  const { stdout } = await execFileAsync('ls', args);
  return stdout;
}

// Safe: No eval usage
function parseJSON(data) {
  return JSON.parse(data);
}

// Safe: Authentication implemented
const server = {
  connect: (credentials) => {
    if (!credentials || !credentials.token) {
      throw new Error('Authentication required');
    }
    console.log('Connected with auth');
  }
};

// Safe: Using environment variables
const API_KEY = process.env.API_KEY;
const PASSWORD = process.env.PASSWORD;

// Safe: User confirmation before destructive action
const fs = require('fs').promises;
async function deleteFile(path, confirmed) {
  if (!confirmed) {
    throw new Error('User confirmation required');
  }
  await fs.unlink(path);
}

// Safe: URL validation
async function fetchData(url) {
  const allowedHosts = ['api.example.com', 'trusted.com'];
  const urlObj = new URL(url);
  if (!allowedHosts.includes(urlObj.hostname)) {
    throw new Error('Untrusted host');
  }
  const response = await fetch(url);
  return response.text();
}

// Safe: Path validation
const path = require('path');
function readUserFile(filename) {
  const basePath = '/var/app/data';
  const fullPath = path.resolve(basePath, filename);
  if (!fullPath.startsWith(basePath)) {
    throw new Error('Path traversal attempt');
  }
  return fs.readFile(fullPath, 'utf-8');
}

// Safe: Filtered environment
function getConfig() {
  return {
    nodeEnv: process.env.NODE_ENV,
    port: process.env.PORT
  };
}

// Safe: Loop with limit
function processItems(items, maxIterations = 1000) {
  let count = 0;
  for (const item of items) {
    if (count++ >= maxIterations) {
      break;
    }
    // Process item
  }
}

// Safe: Parameterized query
function queryUser(username) {
  const query = "SELECT * FROM users WHERE name = ?";
  return db.query(query, [username]);
}

module.exports = {
  runCommand,
  parseJSON,
  deleteFile,
  fetchData,
  readUserFile,
  getConfig,
  processItems,
  queryUser
};
