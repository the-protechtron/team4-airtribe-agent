import { useEffect, useState } from 'react';
import { api } from '../api/client';
import ChatWindow from '../components/ChatWindow.jsx';

export default function PatientDoctorChat() {
  const [threads, setThreads] = useState([]);
  const [activeThreadId, setActiveThreadId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/chat/threads').then(({ data }) => {
      setThreads(data);
      if (data.length) setActiveThreadId(data[0].id);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  if (!threads.length) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-center text-gray-500 text-sm">
        No doctor has started a conversation with you yet. Once a doctor reviews your report, you will be able
        to chat here.
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h2 className="text-lg font-semibold text-teal-800 mb-3">Chat with your doctor</h2>
      <div className="bg-white rounded-xl shadow p-4" style={{ height: '65vh' }}>
        <ChatWindow threadId={activeThreadId} selfRole="PATIENT" />
      </div>
    </div>
  );
}
