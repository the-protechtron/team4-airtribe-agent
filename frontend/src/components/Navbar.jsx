import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Navbar() {
  const { user, logout } = useAuth();

  return (
    <nav className="bg-teal-700 text-white px-6 py-3 flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Link to="/" className="font-bold text-lg">arogyavaani AI</Link>
        {user?.role === 'PATIENT' && (
          <>
            <Link to="/patient" className="text-sm hover:underline">AI Intake</Link>
            <Link to="/patient/cases" className="text-sm hover:underline">My Cases</Link>
            <Link to="/patient/chat-with-doctor" className="text-sm hover:underline">Doctor Chat</Link>
          </>
        )}
        {user?.role === 'DOCTOR' && (
          <Link to="/doctor" className="text-sm hover:underline">Dashboard</Link>
        )}
      </div>
      {user && (
        <div className="flex items-center gap-4 text-sm">
          <span>{user.name} ({user.role})</span>
          <button onClick={logout} className="bg-teal-900 px-3 py-1 rounded hover:bg-teal-800">
            Logout
          </button>
        </div>
      )}
    </nav>
  );
}
