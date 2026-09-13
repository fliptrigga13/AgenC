const { Ollama } = require('ollama');

async function test() {
  const ollama = new Ollama({ host: 'http://localhost:11434' });
  const response = await ollama.chat({
    model: 'qwen2.5-coder:7b',
    messages: [{ role: 'user', content: 'show me SOL and JUP prices' }],
    tools: [
      {
        type: 'function',
        function: {
          name: 'jupiter.getTokenPrice',
          description: 'Get token price',
          parameters: {
            type: 'object',
            properties: {
              mints: { type: 'array', items: { type: 'string' } }
            },
            required: ['mints']
          }
        }
      }
    ]
  });
  console.log('Response:', JSON.stringify(response, null, 2));
}

test().catch(console.error);
