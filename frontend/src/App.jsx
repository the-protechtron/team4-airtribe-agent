import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { useAuth } from './context/AuthContext.jsx';
import DoctorDashboard from './pages/DoctorDashboard.jsx';
import DoctorPatientDetail from './pages/DoctorPatientDetail.jsx';
import Login from './pages/Login.jsx';
import PatientCases from './pages/PatientCases.jsx';
import PatientChat from './pages/PatientChat.jsx';
import PatientDoctorChat from './pages/PatientDoctorChat.jsx';

export default function App() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {user && <Navbar />}
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route
          path="/patient"
          element={<ProtectedRoute role="PATIENT"><PatientChat /></ProtectedRoute>}
        />
        <Route
          path="/patient/chat-with-doctor"
          element={<ProtectedRoute role="PATIENT"><PatientDoctorChat /></ProtectedRoute>}
        />
        <Route
          path="/patient/cases"
          element={<ProtectedRoute role="PATIENT"><PatientCases /></ProtectedRoute>}
        />
        <Route
          path="/doctor"
          element={<ProtectedRoute role="DOCTOR"><DoctorDashboard /></ProtectedRoute>}
        />
        <Route
          path="/doctor/patients/:id"
          element={<ProtectedRoute role="DOCTOR"><DoctorPatientDetail /></ProtectedRoute>}
        />
        <Route path="/" element={<Navigate to="/login" replace />} />
      </Routes>
    </div>
  );
}
