const fs = require('fs');
const readline = require('readline');

const rl = readline.createInterface({
  input: fs.createReadStream('C:/Users/User/.gemini/antigravity/brain/be615e44-15df-443f-90f8-96e7100784c6/.system_generated/logs/transcript_full.jsonl')
});

let found = null;
rl.on('line', (line) => {
  if (line.includes('ActivityController.ts') && line.includes('"name":"write_file"')) {
    try {
      const obj = JSON.parse(line);
      const writeCall = obj.tool_calls && obj.tool_calls.find(t => t.name === 'write_file' && t.args.Path.includes('ActivityController.ts'));
      if (writeCall) {
        found = writeCall.args.Content;
        console.log('Found write_file for ActivityController.ts at step', obj.step_index);
      }
    } catch (e) {}
  }
});

rl.on('close', () => {
  if (found) {
    fs.writeFileSync('backend/controllers/ActivityController.ts', found);
    console.log('Restored ActivityController.ts, length:', found.length);
  } else {
    console.log('Not found in transcript_full');
  }
});
