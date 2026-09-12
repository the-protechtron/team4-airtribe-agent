import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api, downloadReportPdf } from '../api/client';
import UrgencyBadge from '../components/UrgencyBadge.jsx';
import ChatWindow from '../components/ChatWindow.jsx';

const NEXT_ACTIONS = [
  { value: 'NONE', label: 'No action yet' },
  { value: 'SCHEDULE_VISIT', label: 'Schedule visit' },
  { value: 'REFER_TO_HOSPITAL', label: 'Refer to hospital' },
  { value: 'ADVISE_VIA_CHAT', label: 'Advise via chat' },
  { value: 'MARK_RESOLVED', label: 'Mark resolved' },
];

export default function DoctorPatientDetail() {
  const { id } = useParams();
  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [threadId, setThreadId] = useState(null);
  const [showChat, setShowChat] = useState(false);

  useEffect(() => {
    api.get(`/patients/${id}`).then(({ data }) => {
      setPatient(data);
      setLoading(false);
    });
  }, [id]);

  async function updateReport(reportId, patch) {
    const { data } = await api.patch(`/reports/${reportId}`, patch);
    setPatient((prev) => ({
      ...prev,
      reports: prev.reports.map((r) => (r.id === reportId ? { ...r, ...data } : r)),
    }));
  }

  async function openChat() {
    const { data } = await api.post('/chat/threads', { patientId: id });
    setThreadId(data.id);
    setShowChat(true);
  }

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>;
  if (!patient) return <div className="p-6 text-sm text-gray-500">Not found.</div>;

  const latestReport = patient.reports[0];

  return (
    <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 space-y-4">
        <div className="bg-white rounded-xl shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-semibold text-teal-800">{patient.user.name}</h2>
              <p className="text-sm text-gray-500">
                {patient.age ?? '-'} yrs / {patient.gender ?? '-'} / {patient.village ?? '-'}
              </p>
            </div>
            <button onClick={openChat} className="bg-teal-600 text-white px-4 py-2 rounded text-sm hover:bg-teal-700">
              Chat with patient
            </button>
          </div>

          {!latestReport ? (
            <p className="text-sm text-gray-500">No report generated yet for this patient.</p>
          ) : (
            <ReportDetail report={latestReport} onUpdate={updateReport} />
          )}
        </div>

        {patient.conversations.map((c) => (
          <div key={c.id} className="bg-white rounded-xl shadow p-6">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Conversation transcript — {new Date(c.startedAt).toLocaleString()}
            </h3>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              {c.messages.map((m) => (
                <p key={m.id} className="text-sm">
                  <span className="font-medium">{m.sender === 'PATIENT' ? patient.user.name : 'AI Assistant'}:</span>{' '}
                  {m.text}
                </p>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-4" style={{ height: '75vh' }}>
        {showChat && threadId ? (
          <ChatWindow threadId={threadId} selfRole="DOCTOR" />
        ) : (
          <p className="text-sm text-gray-400">Click "Chat with patient" to open a conversation.</p>
        )}
      </div>
    </div>
  );
}

function ReportDetail({ report, onUpdate }) {
  const summary = report.summaryJson;
  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <UrgencyBadge level={report.urgencyLevel} />
        <span className="text-xs text-gray-400">{new Date(report.createdAt).toLocaleString()}</span>
      </div>

      <p className="text-sm mb-2"><strong>Chief complaint:</strong> {summary.chief_complaint}</p>

      <p className="text-sm font-semibold mt-3 mb-1">Symptoms</p>
      <ul className="text-sm list-disc pl-5 mb-2">
        {summary.symptom_summary.map((s, i) => (
          <li key={i}>{s.symptom} — onset {s.onset}, duration {s.duration}, severity {s.severity}</li>
        ))}
      </ul>

      <p className="text-sm font-semibold mt-3 mb-1">Red flags</p>
      <p className="text-sm mb-2">{summary.red_flags?.length ? summary.red_flags.join(', ') : 'None reported'}</p>

      <p className="text-sm font-semibold mt-3 mb-1">Possible conditions (AI hypotheses — not a diagnosis)</p>
      <ul className="text-sm list-disc pl-5 mb-2">
        {summary.possible_conditions.map((c, i) => (
          <li key={i}>{c.condition} — {c.rationale}</li>
        ))}
      </ul>

      <p className="text-sm font-semibold mt-3 mb-1">Recommended next steps</p>
      <p className="text-sm mb-4">{summary.recommended_next_steps}</p>

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={() => downloadReportPdf(report.id)}
          className="bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm hover:bg-gray-200"
        >
          Download PDF
        </button>

        <select
          value={report.nextAction}
          onChange={(e) => onUpdate(report.id, { nextAction: e.target.value })}
          className="border rounded px-3 py-2 text-sm"
        >
          {NEXT_ACTIONS.map((a) => (
            <option key={a.value} value={a.value}>{a.label}</option>
          ))}
        </select>

        {report.reviewStatus === 'PENDING' && (
          <button
            onClick={() => onUpdate(report.id, { reviewStatus: 'REVIEWED', claim: true })}
            className="bg-teal-600 text-white px-3 py-2 rounded text-sm hover:bg-teal-700"
          >
            Mark reviewed
          </button>
        )}
      </div>
    </div>
  );
}
