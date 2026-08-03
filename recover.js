const fs = require('fs');
const readline = require('readline');

async function processLineByLine() {
  const fileStream = fs.createReadStream('C:\\Users\\User\\.gemini\\antigravity-ide\\brain\\7e3b3c68-61f3-4f13-990e-9e68db8589bb\\.system_generated\\logs\\transcript_full.jsonl');

  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let latestContent = null;
  let inDiffBlock = false;
  let lines = [];

  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.type === 'USER_INPUT' && obj.content.includes('[diff_block_start]')) {
         const contentLines = obj.content.split('\n');
         let diffStarted = false;
         lines = [];
         for(let cl of contentLines) {
            if (cl === '[diff_block_start]') {
                diffStarted = true;
                continue;
            }
            if (cl === '[diff_block_end]') {
                diffStarted = false;
                break;
            }
            if (diffStarted) {
                if (cl.startsWith('-')) {
                    lines.push(cl.substring(1));
                }
            }
         }
         // Save the extracted lines
         // skip the first diff header like '@@ -1,1455 +1,1 @@'
         if (lines.length > 0 && lines[0].startsWith('@@ ')) {
            lines.shift();
         }
         latestContent = lines.join('\n');
      }
    } catch (e) {
      // ignore parse errors
    }
  }

  if (latestContent) {
    fs.writeFileSync('e:\\Apps Help\\AplikasiPenjualan.html', latestContent);
    console.log('File restored successfully, length: ' + latestContent.length);
  } else {
    console.log('Could not find the content.');
  }
}

processLineByLine();
