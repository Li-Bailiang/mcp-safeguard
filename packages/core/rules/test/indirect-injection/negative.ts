// TypeScript-specific test cases that should NOT be detected (false positives)

import { readFile } from 'fs/promises';
import axios from 'axios';

// URL with validation
async function fetchData(url: string): Promise<any> {
  if (isValidUrl(url)) {
    return await axios.get(url);
  }
}

// Path with sanitization
async function readUserFile(path: string): Promise<string> {
  const safePath = sanitize(path);
  return await readFile(safePath, 'utf-8');
}

// SQL with parameterized query
async function getUser(id: string): Promise<User> {
  return await db.query('SELECT * FROM users WHERE id = $1', [id]);
}
