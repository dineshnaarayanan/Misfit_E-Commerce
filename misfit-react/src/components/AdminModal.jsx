/* AdminModal.jsx — Mounts the full-page AdminDashboard when adminOpen is true */
import { useApp } from '../context/AppContext';
import AdminDashboard from './admin/AdminDashboard';

export default function AdminModal() {
  const { adminOpen, setAdminOpen, token, currentUser, showToast } = useApp();

  if (!adminOpen) return null;

  return (
    <AdminDashboard
      token={token}
      adminName={currentUser?.name || 'Admin'}
      onLogout={() => setAdminOpen(false)}
      showToast={showToast}
    />
  );
}
