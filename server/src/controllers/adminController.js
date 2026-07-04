import {
  getAllEmployees,
  getEmployeeAttendance,
  saveOrUpdateAttendance,
  getDailySummariesForDate,
  getDailySummariesInRange,
} from "../services/firestoreService.js";

/**
 * GET /api/admin/employees
 * Returns a list of all employees.
 */
export async function listEmployees(req, res) {
  try {
    const list = await getAllEmployees();
    return res.json({ employees: list });
  } catch (err) {
    console.error("List employees failed:", err.message);
    return res.status(500).json({ error: "Failed to list employees" });
  }
}

/**
 * GET /api/admin/employees/:userId/attendance
 * Returns all attendance punch logs for a specific employee.
 */
export async function getEmployeeAttendanceLogs(req, res) {
  try {
    const { userId } = req.params;
    const records = await getEmployeeAttendance(userId);
    return res.json({ attendance: records });
  } catch (err) {
    console.error("Get attendance logs failed:", err.message);
    return res.status(500).json({ error: "Failed to retrieve attendance logs" });
  }
}

/**
 * POST /api/admin/attendance
 * Adds or edits an attendance punch (admin override).
 * Validates request data. Does NOT compute dailySummary directly; the admin
 * client must trigger POST /api/summary/compute right after saving this.
 */
export async function modifyAttendance(req, res) {
  try {
    const { id, userId, type, timestamp } = req.body;

    if (!userId || !type || !timestamp) {
      return res.status(400).json({ error: "userId, type, and timestamp are required" });
    }

    if (type !== "in" && type !== "out") {
      return res.status(400).json({ error: 'Type must be "in" or "out"' });
    }

    // Check if timestamp is a valid ISO date string
    const parsedDate = new Date(timestamp);
    if (isNaN(parsedDate.getTime())) {
      return res.status(400).json({ error: "Invalid timestamp format" });
    }

    const savedId = await saveOrUpdateAttendance({
      id,
      userId,
      type,
      timestamp: parsedDate,
    });

    return res.status(200).json({
      message: id ? "Attendance log updated" : "Attendance log created",
      record: {
        id: savedId,
        userId,
        type,
        timestamp: parsedDate.toISOString(),
      },
    });
  } catch (err) {
    console.error("Modify attendance failed:", err.message);
    return res.status(500).json({ error: "Failed to save attendance log" });
  }
}

/**
 * GET /api/admin/reports/daily
 * Daily report: reads summaries of all employees for a selected date.
 */
export async function getDailyReport(req, res) {
  try {
    const { date } = req.query;

    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: "Date parameter is required in YYYY-MM-DD format" });
    }

    const [summaries, employees] = await Promise.all([
      getDailySummariesForDate(date),
      getAllEmployees(),
    ]);

    // Map employee names to summaries
    const employeeMap = new Map(employees.map((e) => [e.id, e.name]));

    const report = summaries
      .filter((s) => employeeMap.has(s.userId))
      .map((s) => ({
        ...s,
        employeeName: employeeMap.get(s.userId),
      }));

    return res.json({ report });
  } catch (err) {
    console.error("Fetch daily report failed:", err.message);
    return res.status(500).json({ error: "Failed to generate daily report" });
  }
}

/**
 * GET /api/admin/reports/weekly
 * Weekly report: aggregates (sum) each employee's metrics over a selected date range.
 * Range should be a 7-day range (e.g. from Monday to Sunday).
 */
export async function getWeeklyReport(req, res) {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ error: "startDate and endDate parameters are required" });
    }

    const [summaries, employees] = await Promise.all([
      getDailySummariesInRange(startDate, endDate),
      getAllEmployees(),
    ]);

    // Group summaries by userId and aggregate sums
    const aggregates = {};

    // Initialize with all existing employees to ensure everyone is listed
    for (const emp of employees) {
      aggregates[emp.id] = {
        userId: emp.id,
        employeeName: emp.name,
        regularHrs: 0.00,
        ot: 0.00,
        nd: 0.00,
        lateMinutes: 0,
        undertimeMinutes: 0,
        daysWorked: 0,
        incompleteCount: 0,
      };
    }

    for (const sum of summaries) {
      const agg = aggregates[sum.userId];
      if (agg) {
        agg.regularHrs += sum.regularHrs;
        agg.ot += sum.ot;
        agg.nd += sum.nd;
        agg.lateMinutes += sum.lateMinutes;
        agg.undertimeMinutes += sum.undertimeMinutes;
        agg.daysWorked += (sum.regularHrs > 0 || sum.incomplete) ? 1 : 0;
        if (sum.incomplete) {
          agg.incompleteCount += 1;
        }
      }
    }

    // Format numbers
    const report = Object.values(aggregates).map((agg) => ({
      ...agg,
      regularHrs: Number(agg.regularHrs.toFixed(2)),
      ot: Number(agg.ot.toFixed(2)),
      nd: Number(agg.nd.toFixed(2)),
    }));

    return res.json({ report });
  } catch (err) {
    console.error("Fetch weekly report failed:", err.message);
    return res.status(500).json({ error: "Failed to generate weekly report" });
  }
}
