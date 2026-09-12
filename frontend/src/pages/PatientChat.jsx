import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, aiApi, downloadReportPdf } from '../api/client';
import ChatInputBar from '../components/ChatInputBar.jsx';
import { LANGUAGES } from '../constants';

export default function PatientChat() {
  const [language, setLanguage] = useState('en-IN');
  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sending, setSending] = useState(false);
  const [report, setReport] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function startConversation() {
    const { data } = await aiApi.post('/conversations/start', { language });
    setConversationId(data.conversationId);
    setMessages([
      {
        sender: 'AGENT',
        text: 'Hello. Please tell me what problem you are having today — you can type or use the microphone.',
      },
    ]);
    setReport(null);
  }

  async function sendMessage(text) {
    const trimmed = text.trim();
    if (!trimmed || !conversationId || sending) return;
    setSending(true);
    setMessages((prev) => [...prev, { sender: 'PATIENT', text: trimmed }]);
    try {
      const { data } = await aiApi.post(`/conversations/${conversationId}/messages`, { text: trimmed });
      setMessages((prev) => [...prev, { sender: 'AGENT', text: data.agentReply }]);
      if (data.done && data.reportId) {
        const { data: reportData } = await api.get(`/reports/${data.reportId}`);
        setReport(reportData);
      }
    } catch (e) {
      setMessages((prev) => [...prev, { sender: 'AGENT', text: 'Sorry, something went wrong. Please try again.' }]);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      {!conversationId ? (
        <div className="bg-white rounded-xl shadow p-8 text-center">
          <h2 className="text-xl font-semibold text-teal-800 mb-2">Describe your health problem</h2>
          <p className="text-sm text-gray-500 mb-6">
            Choose your language, then speak or type to begin. Our AI assistant will ask a few follow-up
            questions and prepare a report for the doctor.
          </p>
          <select
            className="border rounded px-3 py-2 text-sm mb-4"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            {LANGUAGES.map((l) => (
              <option key={l.code} value={l.code}>{l.label}</option>
            ))}
          </select>
          <div>
            <button
              onClick={startConversation}
              className="bg-teal-600 text-white px-6 py-2 rounded font-medium hover:bg-teal-700"
            >
              Start
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow flex flex-col" style={{ height: '70vh' }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.sender === 'PATIENT' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-sm px-3 py-2 rounded-lg text-sm ${
                    m.sender === 'PATIENT' ? 'bg-teal-600 text-white' : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            ))}
            {sending && <div className="text-xs text-gray-400">Assistant is typing...</div>}
            <div ref={bottomRef} />
          </div>

          {report ? (
            <ReportPanel report={report} />
          ) : (
            <div className="p-3 border-t">
              <ChatInputBar language={language} onSend={sendMessage} disabled={sending} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ReportPanel({ report }) {
  const summary = report.summaryJson;
  return (
    <div className="p-4 border-t bg-teal-50">
      <p className="text-sm font-semibold text-teal-800 mb-2">Your report is ready for the doctor.</p>
      <p className="text-sm text-gray-700 mb-1"><strong>Chief complaint:</strong> {summary.chief_complaint}</p>
      <p className="text-sm text-gray-700 mb-3"><strong>Urgency:</strong> {summary.urgency_level}</p>
      <div className="flex gap-4">
        <button onClick={() => downloadReportPdf(report.id)} className="text-sm text-teal-700 underline">
          Download PDF report
        </button>
        <Link to="/patient/cases" className="text-sm text-teal-700 underline">
          Continue this case in My Cases
        </Link>
      </div>
    </div>
  );
}
