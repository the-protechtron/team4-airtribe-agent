import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { LANGUAGES } from '../constants';

export default function Login() {
  const [portal, setPortal] = useState('PATIENT'); // 'PATIENT' | 'DOCTOR'
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('');
  const [village, setVillage] = useState('');
  const [languagePref, setLanguagePref] = useState('en-IN');
  const [error, setError] = useState('');
  const { login, register, logout } = useAuth();
  const navigate = useNavigate();

  function selectPortal(next) {
    setPortal(next);
    setMode('login');
    setError('');
  }

  async function handleLogin(e) {
    e.preventDefault();
    setError('');
    try {
      const user = await login(email, password);
      if (user.role !== portal) {
        logout();
        setError(
          `This account is registered as a ${user.role === 'DOCTOR' ? 'Doctor' : 'Patient'}. ` +
          `Switch to the ${user.role === 'DOCTOR' ? 'Doctor' : 'Patient'} tab above and try again.`
        );
        return;
      }
      navigate(user.role === 'DOCTOR' ? '/doctor' : '/patient');
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    setError('');
    try {
      await register({
        role: 'PATIENT',
        name,
        email,
        password,
        age: age ? Number(age) : undefined,
        gender,
        village,
        languagePref,
      });
      navigate('/patient');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-teal-50 px-4">
      <div className="bg-white rounded-xl shadow-md p-8 w-full max-w-md">
        <h1 className="text-2xl font-bold text-teal-800 mb-1">arogyavaani AI</h1>
        <p className="text-sm text-gray-500 mb-6">AI-assisted primary health triage for rural communities</p>

        <div className="flex mb-6 bg-gray-100 rounded-lg p-1">
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              portal === 'PATIENT' ? 'bg-teal-600 text-white shadow' : 'text-gray-500'
            }`}
            onClick={() => selectPortal('PATIENT')}
          >
            Patient
          </button>
          <button
            className={`flex-1 py-2 rounded-md text-sm font-medium transition ${
              portal === 'DOCTOR' ? 'bg-teal-600 text-white shadow' : 'text-gray-500'
            }`}
            onClick={() => selectPortal('DOCTOR')}
          >
            Doctor
          </button>
        </div>

        {portal === 'PATIENT' && (
          <div className="flex mb-6 border-b">
            <button
              className={`flex-1 py-2 text-sm font-medium ${mode === 'login' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-gray-400'}`}
              onClick={() => setMode('login')}
            >
              Login
            </button>
            <button
              className={`flex-1 py-2 text-sm font-medium ${mode === 'register' ? 'border-b-2 border-teal-600 text-teal-700' : 'text-gray-400'}`}
              onClick={() => setMode('register')}
            >
              Register as Patient
            </button>
          </div>
        )}

        {error && <p className="text-red-600 text-sm mb-3">{error}</p>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin} className="space-y-3">
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="text"
              placeholder="Email or username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button className="w-full bg-teal-600 text-white rounded py-2 text-sm font-medium hover:bg-teal-700">
              Login as {portal === 'DOCTOR' ? 'Doctor' : 'Patient'}
            </button>
            {portal === 'DOCTOR' ? (
              <p className="text-xs text-gray-400 mt-2">
                Admin: SuperAdmin / Admin@1234
                <br />
                Demo doctor: dr.sharma@airtribe.demo / password123
              </p>
            ) : (
              <p className="text-xs text-gray-400 mt-2">
                Demo patient (live demo): priya@airtribe.demo / password123
              </p>
            )}
          </form>
        ) : (
          <form onSubmit={handleRegister} className="space-y-3">
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Full name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <div className="flex gap-2">
              <input
                className="w-1/2 border rounded px-3 py-2 text-sm"
                placeholder="Age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
              />
              <input
                className="w-1/2 border rounded px-3 py-2 text-sm"
                placeholder="Gender"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              />
            </div>
            <input
              className="w-full border rounded px-3 py-2 text-sm"
              placeholder="Village / Location"
              value={village}
              onChange={(e) => setVillage(e.target.value)}
            />
            <select
              className="w-full border rounded px-3 py-2 text-sm"
              value={languagePref}
              onChange={(e) => setLanguagePref(e.target.value)}
            >
              {LANGUAGES.map((l) => (
                <option key={l.code} value={l.code}>{l.label}</option>
              ))}
            </select>
            <button className="w-full bg-teal-600 text-white rounded py-2 text-sm font-medium hover:bg-teal-700">
              Create account
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
