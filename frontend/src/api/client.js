import axios from 'axios';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
export const AI_URL = import.meta.env.VITE_AI_URL || 'http://localhost:8000';

function makeClient(baseURL) {
  const client = axios.create({ baseURL });
  client.interceptors.request.use((config) => {
    const token = localStorage.getItem('airtribe_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });
  return client;
}

export const api = makeClient(API_URL);
export const aiApi = makeClient(AI_URL);

export async function downloadReportPdf(reportId) {
  const token = localStorage.getItem('airtribe_token');
  const res = await fetch(`${API_URL}/reports/${reportId}/pdf`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error('Failed to download report');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `report-${reportId}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}
