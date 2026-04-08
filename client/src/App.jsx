import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';

import RegisterPage from './pages/RegisterPage';
import Destinations from './pages/Destinations';
import Safety from './pages/Safety';
import About from './pages/About';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import Dashboard from './pages/Dashboard';
import AdminDashboard from './pages/AdminDashboard';
import PageLoader from './components/common/PageLoader';

// Protected Route Component
const ProtectedRoute = ({ children, role }) => {
  const { user, loading } = useAuth();

  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;

  return children;
};



function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={ <LandingPage /> } />
          <Route path="/login" element={ <LoginPage /> } />
          <Route path="/register" element={ <RegisterPage /> } />
          <Route path="/destinations" element={ <Destinations /> } />
          <Route path="/safety" element={ <Safety /> } />
          <Route path="/about" element={ <About /> } />
          <Route path="/forgot-password" element={ <ForgotPasswordPage /> } />
          <Route path="/reset-password/:token" element={ <ResetPasswordPage /> } />
          <Route path="/verify-email" element={ <VerifyEmailPage /> } />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute role="admin">
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
        <Toaster position="top-right" toastOptions={ { duration: 4000 } } />
      </Router>
    </AuthProvider>
  );
}

export default App;
