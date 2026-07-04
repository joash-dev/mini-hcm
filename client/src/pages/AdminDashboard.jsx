import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../services/api.js";
import DataTable from "../components/DataTable.jsx";

export default function AdminDashboard({ userProfile, onLogout }) {
  const [activeTab, setActiveTab] = useState("employees"); // "employees" | "daily" | "weekly"
  const [employees, setEmployees] = useState([]);
  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empAttendance, setEmpAttendance] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Edit / Add Punch Form Modal State
  const [showPunchModal, setShowPunchModal] = useState(false);
  const [editingPunch, setEditingPunch] = useState(null); // null if adding new
  const [punchType, setPunchType] = useState("in");
  const [punchDate, setPunchDate] = useState("");
  const [punchTime, setPunchTime] = useState("");

  // Daily Report State
  const [dailyDate, setDailyDate] = useState("");
  const [dailyReport, setDailyReport] = useState([]);

  // Weekly Report State
  const [weeklyStart, setWeeklyStart] = useState("");
  const [weeklyEnd, setWeeklyEnd] = useState("");
  const [weeklyReport, setWeeklyReport] = useState([]);

  // Set default dates on mount
  useEffect(() => {
    const today = new Date();
    const todayStr = today.toLocaleDateString("sv-SE"); // YYYY-MM-DD
    setDailyDate(todayStr);

    const sixDaysAgo = new Date();
    sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);
    setWeeklyStart(sixDaysAgo.toLocaleDateString("sv-SE"));
    setWeeklyEnd(todayStr);
  }, []);

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest("/admin/employees");
      setEmployees(res.employees || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data depending on active tab
  useEffect(() => {
    if (activeTab === "employees") {
      fetchEmployees();
    }
  }, [activeTab, fetchEmployees]);

  // Load attendance for selected employee
  const loadEmployeeAttendance = async (userId) => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/employees/${userId}/attendance`);
      setEmpAttendance(res.attendance || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectEmployee = (emp) => {
    setSelectedEmp(emp);
    loadEmployeeAttendance(emp.id);
  };

  // Open modal to add a new punch
  const handleOpenAddPunch = () => {
    setEditingPunch(null);
    setPunchType("in");
    const now = new Date();
    setPunchDate(now.toLocaleDateString("sv-SE"));
    setPunchTime(now.toTimeString().substring(0, 5));
    setShowPunchModal(true);
  };

  // Open modal to edit an existing punch
  const handleOpenEditPunch = (punch) => {
    setEditingPunch(punch);
    setPunchType(punch.type);
    
    // Parse timestamp (ISO format stored on client)
    const d = new Date(punch.timestamp);
    setPunchDate(d.toLocaleDateString("sv-SE"));
    setPunchTime(d.toTimeString().substring(0, 5));
    setShowPunchModal(true);
  };

  // Submit Punch Form
  const handleSavePunch = async (e) => {
    e.preventDefault();
    if (!selectedEmp) return;

    setError(null);
    const combinedTimestampStr = `${punchDate}T${punchTime}:00`;
    const punchTimestamp = new Date(combinedTimestampStr);

    if (isNaN(punchTimestamp.getTime())) {
      setError("Please input a valid date and time");
      return;
    }

    try {
      setLoading(true);

      // Step 1: Save or Update punch record
      await apiRequest("/admin/attendance", {
        method: "POST",
        body: {
          id: editingPunch?.id || undefined,
          userId: selectedEmp.id,
          type: punchType,
          timestamp: punchTimestamp.toISOString(),
        },
      });

      // Step 2: Re-trigger computation for the date of the punch log
      await apiRequest("/summary/compute", {
        method: "POST",
        body: {
          userId: selectedEmp.id,
          date: punchDate,
        },
      });

      setShowPunchModal(false);
      // Reload lists
      await loadEmployeeAttendance(selectedEmp.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Manual Trigger Recomputation Button
  const handleRecompute = async (date) => {
    if (!selectedEmp || !date) return;
    setError(null);
    setLoading(true);
    try {
      await apiRequest("/summary/compute", {
        method: "POST",
        body: {
          userId: selectedEmp.id,
          date,
        },
      });
      alert(`Re-computation complete for ${date}`);
      await loadEmployeeAttendance(selectedEmp.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load Daily Report
  const loadDailyReport = async () => {
    if (!dailyDate) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/reports/daily?date=${dailyDate}`);
      setDailyReport(res.report || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Load Weekly Report
  const loadWeeklyReport = async () => {
    if (!weeklyStart || !weeklyEnd) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiRequest(`/admin/reports/weekly?startDate=${weeklyStart}&endDate=${weeklyEnd}`);
      setWeeklyReport(res.report || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Format datetime for presentation in local timezone
  const formatDateTime = (isoStr) => {
    const d = new Date(isoStr);
    return d.toLocaleString();
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-left">
          <h1>Admin Dashboard</h1>
          <p className="dashboard-greeting">
            Welcome Administrator, <strong>{userProfile?.name || "Admin"}</strong>
          </p>
        </div>
        <button className="btn btn-secondary" onClick={onLogout}>
          Sign Out
        </button>
      </header>

      {/* Tab Navigation */}
      <nav className="admin-tabs">
        <button
          className={`btn ${activeTab === "employees" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("employees")}
        >
          Employees
        </button>
        <button
          className={`btn ${activeTab === "daily" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("daily")}
        >
          Daily Report
        </button>
        <button
          className={`btn ${activeTab === "weekly" ? "btn-primary" : "btn-secondary"}`}
          onClick={() => setActiveTab("weekly")}
        >
          Weekly Report
        </button>
      </nav>

      {error && <div className="auth-error">{error}</div>}

      {/* TAB 1: EMPLOYEE MANAGEMENT */}
      {activeTab === "employees" && (
        <div className={`admin-grid ${selectedEmp ? "admin-grid--split" : ""}`}>
          {/* Employee list */}
          <div className="kpi-section">
            <h2>Employee Directory</h2>
            {loading && employees.length === 0 ? (
              <p>Loading directory…</p>
            ) : (
              <div className="employee-list">
                {employees.map((emp) => (
                  <button
                    key={emp.id}
                    className={`employee-list-item ${selectedEmp?.id === emp.id ? "employee-list-item--selected" : ""}`}
                    onClick={() => handleSelectEmployee(emp)}
                  >
                    <div>
                      <p className="emp-name">{emp.name}</p>
                      <p className="emp-email">{emp.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Selected employee attendance list */}
          {selectedEmp && (
            <div className="kpi-section">
              <div className="attendance-header">
                <h2>Attendance Logs: {selectedEmp.name}</h2>
                <button className="btn btn-primary" onClick={handleOpenAddPunch}>
                  + Add Punch
                </button>
              </div>

              <p className="attendance-meta">
                Schedule: <strong>{selectedEmp.schedule?.start} to {selectedEmp.schedule?.end}</strong>
              </p>

              {loading && empAttendance.length === 0 ? (
                <p>Loading punch records…</p>
              ) : empAttendance.length === 0 ? (
                <div className="empty-state">No punch logs found for this employee.</div>
              ) : (
                <DataTable headers={["Date/Time", "Type", "Actions"]}>
                  {empAttendance.map((punch) => {
                    const punchDateString = new Date(punch.timestamp).toLocaleDateString("sv-SE");
                    return (
                      <tr key={punch.id}>
                        <td className="font-semibold">{formatDateTime(punch.timestamp)}</td>
                        <td>
                          <span className={`status-badge ${punch.type === "in" ? "status-badge--success" : "status-badge--warning"}`}>
                            {punch.type.toUpperCase()}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: "flex", gap: "0.5rem" }}>
                            <button className="btn btn-secondary btn-sm" onClick={() => handleOpenEditPunch(punch)}>
                              Edit
                            </button>
                            <button className="btn btn-primary btn-sm" onClick={() => handleRecompute(punchDateString)}>
                              Recompute
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </DataTable>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: DAILY REPORT */}
      {activeTab === "daily" && (
        <div className="kpi-section">
          <h2>Daily Attendance Summary</h2>
          <div className="report-controls">
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
            />
            <button className="btn btn-primary" onClick={loadDailyReport}>
              Generate Report
            </button>
          </div>

          {loading ? (
            <p>Loading report data…</p>
          ) : dailyReport.length === 0 ? (
            <div className="empty-state">No summaries found for this date. Run computations for employees to populate.</div>
          ) : (
            <DataTable headers={["Employee", "Regular (hrs)", "OT (hrs)", "ND (hrs)", "Late (min)", "Undertime (min)", "Status"]}>
              {dailyReport.map((row) => (
                <tr key={row.id}>
                  <td className="font-semibold">{row.employeeName}</td>
                  <td>{row.regularHrs.toFixed(2)}</td>
                  <td>{row.ot.toFixed(2)}</td>
                  <td>{row.nd.toFixed(2)}</td>
                  <td>{row.lateMinutes}</td>
                  <td>{row.undertimeMinutes}</td>
                  <td>
                    <span className={`status-badge ${row.incomplete ? "status-badge--warning" : "status-badge--success"}`}>
                      {row.incomplete ? "Incomplete" : "Complete"}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {/* TAB 3: WEEKLY REPORT */}
      {activeTab === "weekly" && (
        <div className="kpi-section">
          <h2>Weekly Aggregate Report</h2>
          <p className="report-description">
            Aggregates sums of hours and minutes over the selected range (usually Monday to Sunday).
          </p>

          <div className="report-controls">
            <div>
              <label>Start Date:</label>
              <input
                type="date"
                value={weeklyStart}
                onChange={(e) => setWeeklyStart(e.target.value)}
              />
            </div>
            <div>
              <label>End Date:</label>
              <input
                type="date"
                value={weeklyEnd}
                onChange={(e) => setWeeklyEnd(e.target.value)}
              />
            </div>
            <button className="btn btn-primary" onClick={loadWeeklyReport}>
              Generate Aggregate
            </button>
          </div>

          {loading ? (
            <p>Aggregating report data…</p>
          ) : weeklyReport.length === 0 ? (
            <div className="empty-state">No daily summaries found in this range.</div>
          ) : (
            <DataTable headers={["Employee", "Regular (hrs)", "OT (hrs)", "ND (hrs)", "Late (min)", "Undertime (min)", "Days Worked", "Incompletes"]}>
              {weeklyReport.map((row) => (
                <tr key={row.userId}>
                  <td className="font-semibold">{row.employeeName}</td>
                  <td>{row.regularHrs.toFixed(2)}</td>
                  <td>{row.ot.toFixed(2)}</td>
                  <td>{row.nd.toFixed(2)}</td>
                  <td>{row.lateMinutes}</td>
                  <td>{row.undertimeMinutes}</td>
                  <td>{row.daysWorked}</td>
                  <td>
                    <span className={row.incompleteCount > 0 ? "text-danger" : ""}>
                      {row.incompleteCount}
                    </span>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      )}

      {/* PUNCH MODAL OVERLAY */}
      {showPunchModal && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>{editingPunch ? "Edit Punch Log" : "Add Punch Log"}</h2>
            <p className="auth-subtitle">Overriding for {selectedEmp?.name}</p>

            <form onSubmit={handleSavePunch} className="auth-form">
              <div className="form-group">
                <label>Punch Type</label>
                <select
                  value={punchType}
                  onChange={(e) => setPunchType(e.target.value)}
                >
                  <option value="in">PUNCH IN</option>
                  <option value="out">PUNCH OUT</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={punchDate}
                  onChange={(e) => setPunchDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>Time (24h format)</label>
                <input
                  type="time"
                  value={punchTime}
                  onChange={(e) => setPunchTime(e.target.value)}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn btn-primary">
                  Save & Compute
                </button>
                <button type="button" className="btn btn-secondary" onClick={() => setShowPunchModal(false)}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
