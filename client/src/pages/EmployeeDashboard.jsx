import { useEffect } from "react";
import { useAttendance } from "../hooks/useAttendance.js";
import { useDailySummary } from "../hooks/useDailySummary.js";
import PunchButton from "../components/PunchButton.jsx";
import KpiCard from "../components/KpiCard.jsx";
import DataTable from "../components/DataTable.jsx";

/**
 * Employee Dashboard.
 * Displays today's time clock, current shift KPIs (values from today's dailySummary),
 * and a history log of past days' summaries.
 */
export default function EmployeeDashboard({ userProfile, onLogout }) {
  const { status, loading: punchLoading, error: punchError, punch } = useAttendance();
  const { todaySummary, history, loading: summaryLoading, error: summaryError, refresh } = useDailySummary(userProfile?.id);

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
        <button className="btn btn-secondary" onClick={onLogout}>
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
              value={todaySummary ? todaySummary.regularHrs.toFixed(2) : "0.00"}
              unit="hrs"
              type="regular"
            />
            <KpiCard
              label="Overtime"
              value={todaySummary ? todaySummary.ot.toFixed(2) : "0.00"}
              unit="hrs"
              type="overtime"
            />
            <KpiCard
              label="Night Diff"
              value={todaySummary ? todaySummary.nd.toFixed(2) : "0.00"}
              unit="hrs"
              type="nd"
            />
            <KpiCard
              label="Late Time"
              value={todaySummary ? todaySummary.lateMinutes : 0}
              unit="min"
              type="late"
            />
            <KpiCard
              label="Undertime"
              value={todaySummary ? todaySummary.undertimeMinutes : 0}
              unit="min"
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
            <DataTable headers={["Date", "Regular (hrs)", "OT (hrs)", "ND (hrs)", "Late (min)", "Undertime (min)", "Status"]}>
              {history.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.date}</td>
                  <td>{row.regularHrs.toFixed(2)}</td>
                  <td>{row.ot.toFixed(2)}</td>
                  <td>{row.nd.toFixed(2)}</td>
                  <td>{row.lateMinutes}</td>
                  <td>{row.undertimeMinutes}</td>
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
    </div>
  );
}
