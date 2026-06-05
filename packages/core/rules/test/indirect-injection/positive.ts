// TypeScript-specific test cases that SHOULD be detected

import { readFile } from 'fs/promises';
import axios from 'axios';

// Unsanitized URL fetch
async function fetchData(url: string): Promise<any> {
  return await axios.get(url);
}

// Unvalidated file read
async function readUserFile(path: string): Promise<string> {
  return await readFile(path, 'utf-8');
}

// SQL injection
async function getUser(id: string): Promise<User> {
  const query = `SELECT * FROM users WHERE id = '${id}'`;
  return await db.query(query);
}
