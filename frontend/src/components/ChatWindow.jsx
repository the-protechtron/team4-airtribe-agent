import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { API_URL, api } from '../api/client';

export default function ChatWindow({ threadId, selfRole }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    if (!threadId) return;

    api.get(`/chat/threads/${threadId}/messages`).then(({ data }) => setMessages(data));

    const token = localStorage.getItem('airtribe_token');
    const socket = io(API_URL, { auth: { token } });
    socketRef.current = socket;

    socket.emit('join_thread', threadId);
    socket.on('new_message', (msg) => {
      if (msg.threadId === threadId) setMessages((prev) => [...prev, msg]);
    });

    return () => socket.disconnect();
  }, [threadId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  function send() {
    if (!text.trim() || !socketRef.current) return;
    socketRef.current.emit('send_message', { threadId, text: text.trim() });
    setText('');
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-2 space-y-2">
        {messages.map((m) => (
          <div key={m.id} className={`flex ${m.senderRole === selfRole ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-xs px-3 py-2 rounded-lg text-sm ${
                m.senderRole === selfRole ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}
            >
              {m.text}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="pt-3 border-t flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          className="flex-1 border rounded px-3 py-2 text-sm"
        />
        <button onClick={send} className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700">
          Send
        </button>
      </div>
    </div>
  );
}
