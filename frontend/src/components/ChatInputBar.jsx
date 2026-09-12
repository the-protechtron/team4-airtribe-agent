import { useRef, useState } from 'react';

export default function ChatInputBar({ onSend, onTranscribe, disabled }) {
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [speechError, setSpeechError] = useState('');
  const recorderRef = useRef(null);
  const speechSupported = Boolean(navigator.mediaDevices?.getUserMedia && window.MediaRecorder);

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  }

  async function toggleRecording() {
    if (recording) {
      recorderRef.current?.stop();
      return;
    }
    setSpeechError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks = [];
      const recorder = new MediaRecorder(stream);
      recorder.ondataavailable = (event) => event.data.size && chunks.push(event.data);
      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setTranscribing(true);
        try {
          const transcript = await onTranscribe(new Blob(chunks, { type: recorder.mimeType || 'audio/webm' }));
          send(transcript);
        } catch (error) {
          setSpeechError(error.response?.data?.error || 'Could not transcribe audio');
        } finally {
          setTranscribing(false);
        }
      };
      recorder.onerror = () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording(false);
        setSpeechError('Could not record audio');
      };
      recorderRef.current = recorder;
      recorder.start();
      setRecording(true);
    } catch {
      setSpeechError('Microphone permission is required');
    }
  }

  return (
    <div>
      <div className="flex gap-2 items-center">
        {speechSupported && (
          <button
            onClick={toggleRecording}
            disabled={disabled || transcribing}
            className={`px-3 py-2 rounded text-sm font-medium ${
              recording ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
            }`}
            title="Record voice message"
          >
            {recording ? 'Stop' : transcribing ? 'Transcribing...' : 'Mic'}
          </button>
        )}
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send(input)}
          placeholder="Type your message..."
          disabled={disabled || transcribing}
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button
          onClick={() => send(input)}
          disabled={disabled || transcribing}
          className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700 disabled:opacity-50"
        >
          Send
        </button>
      </div>
      {speechError && <p className="text-xs text-red-600 mt-1">{speechError}</p>}
    </div>
  );
}
