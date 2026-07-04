import { useState, useEffect, useCallback } from "react";
import { apiRequest } from "../services/api.js";
import DataTable from "../components/DataTable.jsx";
import { formatMinutes, formatDecimalHours } from "../utils/formatters.js";

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

  // Mobile navigation drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Desktop sidebar collapse state
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Logout confirmation modal state
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Lock body scroll when mobile drawer, logout modal, or punch modal is open
  useEffect(() => {
    if (isDrawerOpen || showLogoutConfirm || showPunchModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isDrawerOpen, showLogoutConfirm, showPunchModal]);

  // Auto-close mobile drawer when switching tabs
  useEffect(() => {
    setIsDrawerOpen(false);
  }, [activeTab]);

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

  // Get initials for avatar display
  const getInitials = (name) => {
    if (!name) return "EE";
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return parts[0].substring(0, 2).toUpperCase();
  };

  return (
    <>
      <div className={`admin-layout ${isCollapsed ? "sidebar-collapsed" : ""}`}>
      {/* Sidebar Drawer Backdrop */}
      {isDrawerOpen && (
        <div className="sidebar-backdrop" onClick={() => setIsDrawerOpen(false)}></div>
      )}

      {/* Left Sidebar */}
      <aside className={`admin-sidebar ${isDrawerOpen ? "open" : ""} ${isCollapsed ? "collapsed" : ""}`}>
        <div className="sidebar-top">
          <button className="sidebar-toggle-desktop" onClick={() => setIsCollapsed(!isCollapsed)}>
            <svg viewBox="0 0 24 24">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          </button>
          {!isCollapsed && <span className="sidebar-logo">Mini HCM</span>}
          <button className="sidebar-close" onClick={() => setIsDrawerOpen(false)}>
            <svg viewBox="0 0 24 24">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`sidebar-nav-item ${activeTab === "employees" ? "active" : ""}`}
            onClick={() => setActiveTab("employees")}
            title={isCollapsed ? "Employees" : ""}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            {!isCollapsed && <span>Employees</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "daily" ? "active" : ""}`}
            onClick={() => setActiveTab("daily")}
            title={isCollapsed ? "Daily Report" : ""}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            {!isCollapsed && <span>Daily Report</span>}
          </button>

          <button
            className={`sidebar-nav-item ${activeTab === "weekly" ? "active" : ""}`}
            onClick={() => setActiveTab("weekly")}
            title={isCollapsed ? "Weekly Report" : ""}
          >
            <svg className="nav-icon" viewBox="0 0 24 24">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            {!isCollapsed && <span>Weekly Report</span>}
          </button>
        </nav>

        <div className="sidebar-bottom">
          <div className="admin-profile-container">
            <div className="admin-profile-avatar">
              {getInitials(userProfile?.name || "Administrator")}
            </div>
            {!isCollapsed && (
              <div className="admin-profile">
                <p className="admin-name">{userProfile?.name || "Administrator"}</p>
                <p className="admin-email">{userProfile?.email || "admin@hcm.com"}</p>
              </div>
            )}
          </div>
          
          <button 
            className={`sidebar-logout-item ${isCollapsed ? "collapsed" : ""}`} 
            onClick={() => setShowLogoutConfirm(true)}
            title={isCollapsed ? "Sign Out" : ""}
          >
            <svg className="logout-icon" viewBox="0 0 24 24">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
            {!isCollapsed && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="admin-main">
        <header className="admin-main-header">
          <div className="header-title-container">
            <button className="sidebar-toggle" onClick={() => setIsDrawerOpen(true)}>
              <svg viewBox="0 0 24 24">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div>
              {activeTab === "employees" && (
                <>
                  <h1>Employee Directory</h1>
                  <p className="admin-main-subtitle">Manage employee profiles, schedule bindings, and manual log overrides.</p>
                </>
              )}
              {activeTab === "daily" && (
                <>
                  <h1>Daily Attendance Summary</h1>
                  <p className="admin-main-subtitle">Daily report of computed regular hours, overtime, night differential, and late logs.</p>
                </>
              )}
              {activeTab === "weekly" && (
                <>
                  <h1>Weekly Aggregate Report</h1>
                  <p className="admin-main-subtitle">Aggregated totals of shift logs, worked hours, and active days over a range.</p>
                </>
              )}
            </div>
          </div>
        </header>

        <div className="admin-main-content">
          {error && <div className="auth-error" style={{ marginBottom: "1.5rem" }}>{error}</div>}

          {/* TAB 1: EMPLOYEE MANAGEMENT */}
          {activeTab === "employees" && (
            <>
              {/* Summary Stat Cards */}
              <div className="admin-stats-grid">
                <div className="kpi-card kpi-card--regular">
                  <div className="kpi-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                  </div>
                  <span className="kpi-label">Total Employees</span>
                  <div className="kpi-value-container">
                    <span className="kpi-value">{employees.length}</span>
                  </div>
                </div>

                <div className="kpi-card kpi-card--nd">
                  <div className="kpi-icon">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <polyline points="12 6 12 12 16 14" />
                    </svg>
                  </div>
                  <span className="kpi-label">Default Shift</span>
                  <div className="kpi-value-container">
                    <span className="kpi-value">9.0</span>
                    <span className="kpi-unit">hrs</span>
                  </div>
                </div>

                <div className="kpi-card kpi-card--overtime">
                  <div className="kpi-icon">
                    <svg viewBox="0 0 24 24">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                    </svg>
                  </div>
                  <span className="kpi-label">Selected Logs</span>
                  <div className="kpi-value-container">
                    <span className="kpi-value">{selectedEmp ? empAttendance.length : 0}</span>
                    <span className="kpi-unit">entries</span>
                  </div>
                </div>
              </div>

              <div className={`admin-grid ${selectedEmp ? "admin-grid--split" : ""}`}>
                {/* Employee list */}
                <div className="kpi-section">
                  <h2>Employees List</h2>
                  {loading && employees.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-state-icon">
                        <svg viewBox="0 0 24 24">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="16" x2="12" y2="12" />
                          <line x1="12" y1="8" x2="12.01" y2="8" />
                        </svg>
                      </div>
                      <p>Loading directory…</p>
                    </div>
                  ) : (
                    <div className="employee-list">
                      {employees.map((emp) => (
                        <button
                          key={emp.id}
                          className={`employee-list-item ${selectedEmp?.id === emp.id ? "employee-list-item--selected" : ""}`}
                          onClick={() => handleSelectEmployee(emp)}
                        >
                          <div className="employee-avatar">
                            {getInitials(emp.name)}
                          </div>
                          <div className="employee-details">
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
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <svg viewBox="0 0 24 24">
                            <circle cx="12" cy="12" r="10" />
                            <polyline points="12 6 12 12 16 14" />
                          </svg>
                        </div>
                        <p>Loading punch records…</p>
                      </div>
                    ) : empAttendance.length === 0 ? (
                      <div className="empty-state">
                        <div className="empty-state-icon">
                          <svg viewBox="0 0 24 24">
                            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                            <line x1="9" y1="9" x2="15" y2="9" />
                            <line x1="9" y1="13" x2="15" y2="13" />
                            <line x1="9" y1="17" x2="13" y2="17" />
                          </svg>
                        </div>
                        <p>No punch logs found for this employee.</p>
                      </div>
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
            </>
          )}

          {/* TAB 2: DAILY REPORT */}
          {activeTab === "daily" && (
            <div className="kpi-section">
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
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <p>Loading report data…</p>
                </div>
              ) : dailyReport.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="13" y2="17" />
                    </svg>
                  </div>
                  <p>No summaries found for this date. Run computations for employees to populate.</p>
                </div>
              ) : (
                <DataTable headers={["Employee", "Regular", "OT", "ND", "Late", "Undertime", "Status"]}>
                  {dailyReport.map((row) => (
                    <tr key={row.id}>
                      <td className="font-semibold">{row.employeeName}</td>
                      <td>{formatDecimalHours(row.regularHrs)}</td>
                      <td>{formatDecimalHours(row.ot)}</td>
                      <td>{formatDecimalHours(row.nd)}</td>
                      <td>{formatMinutes(row.lateMinutes)}</td>
                      <td>{formatMinutes(row.undertimeMinutes)}</td>
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
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="16" x2="12" y2="12" />
                      <line x1="12" y1="8" x2="12.01" y2="8" />
                    </svg>
                  </div>
                  <p>Aggregating report data…</p>
                </div>
              ) : weeklyReport.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <svg viewBox="0 0 24 24">
                      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                      <line x1="9" y1="9" x2="15" y2="9" />
                      <line x1="9" y1="13" x2="15" y2="13" />
                      <line x1="9" y1="17" x2="13" y2="17" />
                    </svg>
                  </div>
                  <p>No daily summaries found in this range.</p>
                </div>
              ) : (
                <DataTable headers={["Employee", "Regular", "OT", "ND", "Late", "Undertime", "Days Worked", "Incompletes"]}>
                  {weeklyReport.map((row) => (
                    <tr key={row.userId}>
                      <td className="font-semibold">{row.employeeName}</td>
                      <td>{formatDecimalHours(row.regularHrs)}</td>
                      <td>{formatDecimalHours(row.ot)}</td>
                      <td>{formatDecimalHours(row.nd)}</td>
                      <td>{formatMinutes(row.lateMinutes)}</td>
                      <td>{formatMinutes(row.undertimeMinutes)}</td>
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
        </div>
      </main>

      </div>

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

      {showLogoutConfirm && (
        <div className="modal-overlay">
          <div className="modal-card">
            <h2>Sign Out Confirmation</h2>
            <p className="modal-text">Are you sure you want to sign out?</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={onLogout}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
