const test = require('node:test');
const assert = require('node:assert/strict');
const { transcribeAudio, synthesizeSpeech } = require('./speech');

test('speech providers return transcript and audio', async () => {
  process.env.ASSEMBLYAI_API_KEY = 'assembly-key';
  process.env.ELEVENLABS_API_KEY = 'eleven-key';
  const replies = [
    { upload_url: 'https://audio.test/file' },
    { id: 'transcript-id' },
    { status: 'completed', text: '  hello  ' },
  ];
  const fakeFetch = async () => new Response(JSON.stringify(replies.shift()));
  assert.equal(await transcribeAudio(Buffer.from('audio'), fakeFetch, async () => {}), 'hello');

  const audio = await synthesizeSpeech('hello', async () => new Response(Buffer.from('mp3')));
  assert.equal(Buffer.from(await audio.arrayBuffer()).toString(), 'mp3');
});
