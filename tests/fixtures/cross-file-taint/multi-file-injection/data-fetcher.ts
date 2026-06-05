// File A: Fetches user-controlled data
export async function fetchUserData(url: string) {
  const response = await fetch(url);
  return response.text();
}

export const userData = await fetch(process.argv[2]).then(r => r.text());

export function getUserInput() {
  return process.env.USER_INPUT || '';
}
