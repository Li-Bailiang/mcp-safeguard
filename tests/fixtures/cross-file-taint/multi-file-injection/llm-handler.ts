// File B: Uses the tainted data with LLM
import { userData, getUserInput } from './data-fetcher';

// This should be detected - tainted data flows to LLM
export async function sendToLLM(llm: any) {
  // Dangerous: userData is tainted from fetch
  await llm.sendMessage(userData);
}

export function processUserInput(llm: any) {
  const input = getUserInput();
  // Dangerous: input from env variable
  llm.send({ content: input });
}
