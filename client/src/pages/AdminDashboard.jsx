/**
 * Admin Dashboard — shell for Phase 1.
 * Will be populated with employee list, attendance editing,
 * and daily/weekly reports in Phase 6.
 */
export default function AdminDashboard({ userProfile, onLogout }) {
  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Admin Dashboard</h1>
          <p className="dashboard-greeting">
            Welcome, <strong>{userProfile?.name || "Admin"}</strong>
          </p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout}>
          Sign Out
        </button>
      </header>

      <main className="dashboard-content">
        <div className="empty-state">
          <p>Admin panel is ready. Employee management and reports coming in Phase 6.</p>
        </div>
      </main>
    </div>
  );
}
