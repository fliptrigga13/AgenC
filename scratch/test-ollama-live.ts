import { OllamaProvider } from '../runtime/src/llm/ollama/adapter.js';

async function main() {
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'jupiter.getTokenPrice',
        description: 'Get token price in USD via Jupiter Price API',
        parameters: {
          type: 'object',
          properties: {
            mints: {
              type: 'array',
              items: { type: 'string' },
              description: 'Token symbols (e.g. SOL, JUP) or mint addresses to look up',
            }
          },
          required: ['mints']
        }
      }
    }
  ];

  const provider = new OllamaProvider({
    model: 'qwen2.5-coder:7b',
    host: 'http://localhost:11434',
    maxTokens: 2048,
    tools,
  });

  console.log('Calling chatStream...');
  let fullStreamContent = '';
  const response = await provider.chatStream(
    [
      {
        role: 'system',
        content: 'You are an autonomous Solana DeFi agent. When the user asks for token prices, call jupiter.getTokenPrice.',
      },
      {
        role: 'user',
        content: 'show me SOL and JUP prices',
      }
    ],
    (chunk) => {
      if (chunk.content) {
        fullStreamContent += chunk.content;
        process.stdout.write(chunk.content);
      }
    }
  );

  console.log('\n--- Result ---');
  console.log('finishReason:', response.finishReason);
  console.log('toolCalls:', JSON.stringify(response.toolCalls, null, 2));
  console.log('content:', response.content);
}

main().catch(console.error);
