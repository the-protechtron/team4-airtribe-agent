import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import UrgencyBadge from '../components/UrgencyBadge.jsx';

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/patients').then(({ data }) => {
      setPatients(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h2 className="text-lg font-semibold text-teal-800 mb-4">Patients</h2>
      <div className="bg-white rounded-xl shadow overflow-hidden overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-gray-500">
            <tr>
              <th className="px-4 py-2">Name</th>
              <th className="px-4 py-2">Village</th>
              <th className="px-4 py-2">Last Activity</th>
              <th className="px-4 py-2">Urgency</th>
              <th className="px-4 py-2">Status</th>
              <th className="px-4 py-2"></th>
            </tr>
          </thead>
          <tbody>
            {patients.map((p) => (
              <tr key={p.patientId} className="border-t">
                <td className="px-4 py-3 font-medium">{p.name}</td>
                <td className="px-4 py-3 text-gray-500">{p.village || '-'}</td>
                <td className="px-4 py-3 text-gray-500">
                  {p.lastActivity ? new Date(p.lastActivity).toLocaleString() : '-'}
                </td>
                <td className="px-4 py-3"><UrgencyBadge level={p.latestReport?.urgencyLevel} /></td>
                <td className="px-4 py-3 text-gray-500">{p.latestReport?.reviewStatus || '-'}</td>
                <td className="px-4 py-3">
                  <Link to={`/doctor/patients/${p.patientId}`} className="text-teal-700 underline">
                    View
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
