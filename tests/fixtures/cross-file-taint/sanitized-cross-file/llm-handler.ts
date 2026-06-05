// File B: Uses sanitized data with LLM
import { safeData, getSafeInput } from './data-fetcher';

// This should NOT be detected - data is sanitized
export async function sendToLLM(llm: any) {
  // Safe: safeData is sanitized
  await llm.sendMessage(safeData);
}

export function processUserInput(llm: any) {
  const input = getSafeInput();
  // Safe: input is sanitized
  llm.send({ content: input });
}
