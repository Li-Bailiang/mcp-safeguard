import { sendToLLM, processUserInput } from './llm-handler';

const mockLLM = {
  sendMessage: async (msg: string) => console.log(msg),
  send: (data: any) => console.log(data)
};

await sendToLLM(mockLLM);
processUserInput(mockLLM);
