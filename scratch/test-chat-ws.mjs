import WebSocket from 'ws';

const ws = new WebSocket('ws://127.0.0.1:3100');

ws.on('open', () => {
  console.log('Connected to gateway WebSocket');
  ws.send(JSON.stringify({
    type: 'chat.message',
    payload: {
      content: 'show me SOL and JUP prices',
    }
  }));
});

ws.on('message', (data) => {
  const msg = JSON.parse(data.toString());
  console.log('[WS MSG]', msg.type, msg.toolName || '', msg.content ? `content: "${msg.content.slice(0, 100)}..."` : (msg.payload?.content ? `payload.content: "${msg.payload.content.slice(0, 100)}..."` : ''));
  if (msg.type === 'chat.message' && (msg.sender === 'agent' || msg.payload?.sender === 'agent')) {
    console.log('\n--- FULL AGENT RESPONSE ---');
    console.log(msg.content || msg.payload?.content);
    console.log('---------------------------');
    ws.close();
  }
});

ws.on('close', () => {
  console.log('WS Connection closed.');
  process.exit(0);
});

ws.on('error', (err) => {
  console.error('WS error:', err);
  process.exit(1);
});
