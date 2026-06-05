// File A: Fetches data but sanitizes it
export async function fetchUserData(url: string) {
  const response = await fetch(url);
  const text = await response.text();
  // Sanitize the data
  return sanitize(text);
}

function sanitize(input: string): string {
  // Remove potentially dangerous characters
  return input.replace(/[<>\"']/g, '');
}

export const safeData = sanitize(process.env.SAFE_DATA || '');

export function getSafeInput() {
  const input = process.env.USER_INPUT || '';
  return sanitize(input);
}
