import { useState, useEffect } from "react";
import { useAttendance } from "../hooks/useAttendance.js";
import { useDailySummary } from "../hooks/useDailySummary.js";
import PunchButton from "../components/PunchButton.jsx";
import KpiCard from "../components/KpiCard.jsx";
import DataTable from "../components/DataTable.jsx";
import { formatMinutes, formatDecimalHours } from "../utils/formatters.js";

/**
 * Employee Dashboard.
 * Displays today's time clock, current shift KPIs (values from today's dailySummary),
 * and a history log of past days' summaries.
 */
export default function EmployeeDashboard({ userProfile, onLogout }) {
  const { status, loading: punchLoading, error: punchError, punch } = useAttendance();
  const { todaySummary, history, loading: summaryLoading, error: summaryError, refresh } = useDailySummary(userProfile?.id);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Automatically refresh summary data whenever attendance status changes (e.g. after punch out)
  useEffect(() => {
    refresh();
  }, [status, refresh]);

  const isLoading = punchLoading || summaryLoading;
  const error = punchError || summaryError;

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Employee Dashboard</h1>
          <p className="dashboard-greeting">
            Welcome, <strong>{userProfile?.name || "Employee"}</strong>
          </p>
        </div>
        <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(true)}>
          Sign Out
        </button>
      </header>

      <main className="dashboard-content">
        {/* Attendance Punch Clock */}
        <PunchButton
          status={status}
          loading={punchLoading}
          error={punchError}
          punch={punch}
        />

        {error && <div className="auth-error">{error}</div>}

        {/* today's KPI Summary Metrics */}
        <section className="kpi-section">
          <h2>Today&apos;s Metrics</h2>
          <div className="kpi-grid">
            <KpiCard
              label="Regular Hours"
              value={todaySummary ? formatDecimalHours(todaySummary.regularHrs) : "0h"}
              unit=""
              type="regular"
            />
            <KpiCard
              label="Overtime"
              value={todaySummary ? formatDecimalHours(todaySummary.ot) : "0h"}
              unit=""
              type="overtime"
            />
            <KpiCard
              label="Night Diff"
              value={todaySummary ? formatDecimalHours(todaySummary.nd) : "0h"}
              unit=""
              type="nd"
            />
            <KpiCard
              label="Late Time"
              value={todaySummary ? formatMinutes(todaySummary.lateMinutes) : "0m"}
              unit=""
              type="late"
            />
            <KpiCard
              label="Undertime"
              value={todaySummary ? formatMinutes(todaySummary.undertimeMinutes) : "0m"}
              unit=""
              type="undertime"
            />
          </div>
        </section>

        {/* History Table */}
        <section className="history-section">
          <h2>Attendance Log</h2>

          {isLoading && history.length === 0 ? (
            <div className="empty-state">Loading summaries…</div>
          ) : history.length === 0 ? (
            <div className="empty-state">No summaries recorded yet. Punch out to create your first record.</div>
          ) : (
            <DataTable headers={["Date", "Regular", "OT", "ND", "Late", "Undertime", "Status"]}>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.date}</td>
                  <td>{formatDecimalHours(row.regularHrs)}</td>
                  <td>{formatDecimalHours(row.ot)}</td>
                  <td>{formatDecimalHours(row.nd)}</td>
                  <td>{formatMinutes(row.lateMinutes)}</td>
                  <td>{formatMinutes(row.undertimeMinutes)}</td>
                  <td>
                    <span className={`status-badge ${row.incomplete ? "status-badge--warning" : "status-badge--success"}`}>
                      {row.incomplete ? "Incomplete Punch" : "Complete"}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </section>
      </main>

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Sign Out Confirmation</h2>
            <p style={{ marginTop: "0.5rem", color: "var(--text-secondary)" }}>
              Are you sure you want to sign out?
            </p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={onLogout}
                style={{ backgroundColor: "var(--danger)", borderColor: "var(--danger)" }}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
