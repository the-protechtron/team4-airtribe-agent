import { useRef, useState } from 'react';

function getSpeechRecognition() {
  return window.SpeechRecognition || window.webkitSpeechRecognition;
}

export default function ChatInputBar({ language = 'en-IN', onSend, disabled }) {
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef(null);
  const speechSupported = Boolean(getSpeechRecognition());

  function send(text) {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setInput('');
  }

  function toggleListening() {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) return;

    if (listening) {
      recognitionRef.current?.stop();
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      send(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    recognitionRef.current = recognition;
    recognition.start();
    setListening(true);
  }

  return (
    <div className="flex gap-2 items-center">
      {speechSupported && (
        <button
          onClick={toggleListening}
          disabled={disabled}
          className={`px-3 py-2 rounded text-sm font-medium ${
            listening ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'
          }`}
          title="Speak"
        >
          {listening ? 'Listening...' : 'Mic'}
        </button>
      )}
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && send(input)}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1 border rounded px-3 py-2 text-sm"
      />
      <button
        onClick={() => send(input)}
        disabled={disabled}
        className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700 disabled:opacity-50"
      >
        Send
      </button>
    </div>
  );
}
