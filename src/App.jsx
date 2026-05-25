import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/common/ProtectedRoute.jsx';
import AdminLayout from './layouts/AdminLayout.jsx';
import CourierLayout from './layouts/CourierLayout.jsx';
import Login from './pages/Login.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';
import Announcements from './pages/admin/Announcements.jsx';
import Assignments from './pages/admin/Assignments.jsx';
import Couriers from './pages/admin/Couriers.jsx';
import Reports from './pages/admin/Reports.jsx';
import Restaurants from './pages/admin/Restaurants.jsx';
import DailyReport from './pages/admin/DailyReport.jsx';
import AdminUsers from './pages/admin/AdminUsers.jsx';
import AuditLogs from './pages/admin/AuditLogs.jsx';
import Unauthorized from './pages/Unauthorized.jsx';
import NotFound from './pages/NotFound.jsx';
import CourierAnnouncements from './pages/courier/CourierAnnouncements.jsx';
import CourierDashboard from './pages/courier/CourierDashboard.jsx';
import Earnings from './pages/courier/Earnings.jsx';
import Shift from './pages/courier/Shift.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/unauthorized" element={<Unauthorized />} />

      <Route element={<ProtectedRoute role="admin" />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="couriers" element={<Couriers />} />
          <Route path="restaurants" element={<Restaurants />} />
          <Route path="assignments" element={<Assignments />} />
          <Route path="reports" element={<Reports />} />
          <Route path="daily-report" element={<DailyReport />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="admins" element={<AdminUsers />} />
          <Route path="audit-logs" element={<AuditLogs />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute role="courier" />}>
        <Route path="/courier" element={<CourierLayout />}>
          <Route index element={<Navigate to="/courier/dashboard" replace />} />
          <Route path="dashboard" element={<CourierDashboard />} />
          <Route path="shift" element={<Shift />} />
          <Route path="earnings" element={<Earnings />} />
          <Route path="announcements" element={<CourierAnnouncements />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
