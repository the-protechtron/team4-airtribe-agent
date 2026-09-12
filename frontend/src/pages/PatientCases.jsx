import { useEffect, useRef, useState } from 'react';
import { api, aiApi, downloadReportPdf } from '../api/client';
import ChatInputBar from '../components/ChatInputBar.jsx';
import UrgencyBadge from '../components/UrgencyBadge.jsx';

export default function PatientCases() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.get('/patients/me/cases').then(({ data }) => {
      setCases(data);
      setLoading(false);
    });
  }, []);

  async function openCase(conversationId) {
    setSelectedId(conversationId);
    const { data } = await api.get(`/patients/me/cases/${conversationId}`);
    setDetail(data);
  }

  async function sendFollowUp(text) {
    if (!detail) return;
    setSending(true);
    setDetail((prev) => ({
      ...prev,
      messages: [...prev.messages, { id: `local-${Date.now()}`, sender: 'PATIENT', text }],
    }));
    try {
      const { data } = await aiApi.post(`/conversations/${detail.id}/messages`, { text });
      setDetail((prev) => ({
        ...prev,
        status: data.done ? 'COMPLETED' : 'ACTIVE',
        messages: [...prev.messages, { id: `local-${Date.now()}-agent`, sender: 'AGENT', text: data.agentReply }],
      }));
      if (data.reportId) {
        const { data: reportData } = await api.get(`/reports/${data.reportId}`);
        setDetail((prev) => ({ ...prev, report: reportData }));
        setCases((prev) => prev.map((c) => (
          c.conversationId === detail.id
            ? { ...c, report: reportData, status: 'COMPLETED' }
            : c
        )));
      }
    } catch (e) {
      setDetail((prev) => ({
        ...prev,
        messages: [...prev.messages, {
          id: `local-${Date.now()}-err`, sender: 'AGENT', text: 'Sorry, something went wrong. Please try again.',
        }],
      }));
    } finally {
      setSending(false);
    }
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="bg-white rounded-xl shadow p-4">
        <h2 className="text-lg font-semibold text-teal-800 mb-3">My Cases</h2>
        {!cases.length && <p className="text-sm text-gray-500">No past conversations yet.</p>}
        <div className="space-y-2">
          {cases.map((c) => (
            <button
              key={c.conversationId}
              onClick={() => openCase(c.conversationId)}
              className={`w-full text-left border rounded-lg p-3 text-sm hover:border-teal-500 ${
                selectedId === c.conversationId ? 'border-teal-600 bg-teal-50' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">Case #{c.caseNumber}</span>
                <UrgencyBadge level={c.report?.urgencyLevel} />
              </div>
              <p className="text-xs text-gray-500 mt-1">{new Date(c.startedAt).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1 break-all">ID: {c.conversationId}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2 bg-white rounded-xl shadow p-6 flex flex-col" style={{ height: '75vh' }}>
        {!detail ? (
          <p className="text-sm text-gray-400">Select a case to view and continue the conversation.</p>
        ) : (
          <CaseDetail detail={detail} sending={sending} onSend={sendFollowUp} />
        )}
      </div>
    </div>
  );
}

function CaseDetail({ detail, sending, onSend }) {
  const summary = detail.report?.summaryJson;
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detail.messages.length]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-3 shrink-0">
        <div>
          <h3 className="text-lg font-semibold text-teal-800 break-all">Case ID: {detail.id}</h3>
          <p className="text-xs text-gray-500">{new Date(detail.startedAt).toLocaleString()} — {detail.status}</p>
        </div>
        {detail.report && (
          <button
            onClick={() => downloadReportPdf(detail.report.id)}
            className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200 shrink-0"
          >
            Download PDF
          </button>
        )}
      </div>

      {summary && (
        <div className="mb-3 shrink-0 bg-teal-50 rounded p-3">
          <p className="text-sm mb-1"><strong>Chief complaint:</strong> {summary.chief_complaint}</p>
          <p className="text-sm mb-1"><strong>Urgency:</strong> {summary.urgency_level}</p>
          <p className="text-sm"><strong>Next steps:</strong> {summary.recommended_next_steps}</p>
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-2 mb-3 border rounded p-3">
        {detail.messages.map((m) => (
          <div key={m.id} className={`flex ${m.sender === 'PATIENT' ? 'justify-end' : 'justify-start'}`}>
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

      <div className="shrink-0">
        {summary && (
          <p className="text-xs text-gray-400 mb-2">
            This case already has a report. Sending a new message continues the same conversation and
            may update the report if the AI learns something new.
          </p>
        )}
        <ChatInputBar onSend={onSend} disabled={sending} />
      </div>
    </div>
  );
}
