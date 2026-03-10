import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';

// Influencer
import InfluencerDashboard from './pages/influencer/DashboardPage';
import TasksPage from './pages/influencer/TasksPage';
import SubmitProofPage from './pages/influencer/SubmitProofPage';
import WalletPage from './pages/influencer/WalletPage';
import TrainingPage from './pages/influencer/TrainingPage';
import WellnessPage from './pages/influencer/WellnessPage';

// Business
import BusinessDashboard from './pages/business/DashboardPage';
import PostTaskPage from './pages/business/PostTaskPage';
import CampaignsPage from './pages/business/CampaignsPage';
import SubscriptionPage from './pages/business/SubscriptionPage';

// Admin
import AdminDashboard from './pages/admin/DashboardPage';
import AdminUsersPage from './pages/admin/UsersPage';
import AdminBusinessesPage from './pages/admin/BusinessesPage';
import AdminTasksPage from './pages/admin/TasksPage';
import AdminPaymentsPage from './pages/admin/PaymentsPage';
import TrainingAdminPage from './pages/admin/TrainingAdminPage';
import WellnessAdminPage from './pages/admin/WellnessAdminPage';

function RequireAuth({ children, roles }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  const defaultPath = user?.role === 'admin' ? '/admin/dashboard'
    : user?.role === 'business' ? '/business/dashboard'
    : user ? '/dashboard'
    : '/';

  return (
    <>
      <Navbar />
      <Routes>
        <Route path="/" element={user ? <Navigate to={defaultPath} replace /> : <LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Influencer */}
        <Route path="/dashboard" element={<RequireAuth roles={['influencer']}><InfluencerDashboard /></RequireAuth>} />
        <Route path="/tasks" element={<RequireAuth roles={['influencer']}><TasksPage /></RequireAuth>} />
        <Route path="/tasks/:id/submit" element={<RequireAuth roles={['influencer']}><SubmitProofPage /></RequireAuth>} />
        <Route path="/wallet" element={<RequireAuth roles={['influencer']}><WalletPage /></RequireAuth>} />
        <Route path="/training" element={<RequireAuth roles={['influencer']}><TrainingPage /></RequireAuth>} />
        <Route path="/wellness" element={<RequireAuth roles={['influencer']}><WellnessPage /></RequireAuth>} />

        {/* Business */}
        <Route path="/business/dashboard" element={<RequireAuth roles={['business']}><BusinessDashboard /></RequireAuth>} />
        <Route path="/business/tasks/new" element={<RequireAuth roles={['business']}><PostTaskPage /></RequireAuth>} />
        <Route path="/business/campaigns" element={<RequireAuth roles={['business']}><CampaignsPage /></RequireAuth>} />
        <Route path="/business/subscription" element={<RequireAuth roles={['business']}><SubscriptionPage /></RequireAuth>} />

        {/* Admin */}
        <Route path="/admin/dashboard" element={<RequireAuth roles={['admin']}><AdminDashboard /></RequireAuth>} />
        <Route path="/admin/users" element={<RequireAuth roles={['admin']}><AdminUsersPage /></RequireAuth>} />
        <Route path="/admin/businesses" element={<RequireAuth roles={['admin']}><AdminBusinessesPage /></RequireAuth>} />
        <Route path="/admin/tasks" element={<RequireAuth roles={['admin']}><AdminTasksPage /></RequireAuth>} />
        <Route path="/admin/payments" element={<RequireAuth roles={['admin']}><AdminPaymentsPage /></RequireAuth>} />
        <Route path="/admin/training" element={<RequireAuth roles={['admin']}><TrainingAdminPage /></RequireAuth>} />
        <Route path="/admin/wellness" element={<RequireAuth roles={['admin']}><WellnessAdminPage /></RequireAuth>} />

        {/* Shared */}
        <Route path="/notifications" element={<RequireAuth><NotificationsPage /></RequireAuth>} />
        <Route path="/profile" element={<RequireAuth><ProfilePage /></RequireAuth>} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
