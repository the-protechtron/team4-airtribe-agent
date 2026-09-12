const ASSEMBLYAI_URL = 'https://api.assemblyai.com/v2';
const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function expectOk(response, provider) {
  if (response.ok) return response;
  throw new Error(`${provider} request failed (${response.status})`);
}

async function transcribeAudio(audio, fetchImpl = fetch, wait = sleep) {
  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) throw new Error('ASSEMBLYAI_API_KEY is not configured');

  const headers = { authorization: apiKey };
  const upload = await expectOk(await fetchImpl(`${ASSEMBLYAI_URL}/upload`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/octet-stream' },
    body: audio,
  }), 'AssemblyAI upload');
  const { upload_url: audioUrl } = await upload.json();

  const submit = await expectOk(await fetchImpl(`${ASSEMBLYAI_URL}/transcript`, {
    method: 'POST',
    headers: { ...headers, 'content-type': 'application/json' },
    body: JSON.stringify({
      audio_url: audioUrl,
      speech_models: ['universal-3-pro', 'universal-2'],
      language_detection: true,
    }),
  }), 'AssemblyAI transcription');
  const { id } = await submit.json();

  for (let attempt = 0; attempt < 30; attempt += 1) {
    const poll = await expectOk(await fetchImpl(`${ASSEMBLYAI_URL}/transcript/${id}`, { headers }), 'AssemblyAI polling');
    const transcript = await poll.json();
    if (transcript.status === 'completed') return transcript.text?.trim() || '';
    if (transcript.status === 'error') throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
    await wait(2000);
  }
  throw new Error('AssemblyAI transcription timed out');
}

async function synthesizeSpeech(text, fetchImpl = fetch) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) throw new Error('ELEVENLABS_API_KEY is not configured');
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'JBFqnCBsd6RMkjVDRZzb';
  const modelId = process.env.ELEVENLABS_MODEL || 'eleven_v3';
  return expectOk(await fetchImpl(`${ELEVENLABS_URL}/text-to-speech/${voiceId}?output_format=mp3_44100_128`, {
    method: 'POST',
    headers: { 'xi-api-key': apiKey, 'content-type': 'application/json', accept: 'audio/mpeg' },
    body: JSON.stringify({ text, model_id: modelId }),
  }), 'ElevenLabs');
}

module.exports = { transcribeAudio, synthesizeSpeech };
