/**
 * Helper to set hours and minutes on a specific date object.
 */
function setTimeOnDate(date, hh, mm) {
  const d = new Date(date);
  d.setHours(hh, mm, 0, 0);
  return d;
}

/**
 * Helper to calculate overlap hours between two intervals.
 */
function getOverlapHours(startA, endA, startB, endB) {
  const start = Math.max(startA.getTime(), startB.getTime());
  const end = Math.min(endA.getTime(), endB.getTime());
  if (start < end) {
    return (end - start) / (1000 * 60 * 60);
  }
  return 0;
}

/**
 * Computes attendance and payroll metrics for a single shift.
 * Pure function with no Firestore, Express, or I/O dependencies.
 *
 * @param {Object} params
 * @param {Date} params.punchIn
 * @param {Date|null} params.punchOut  // null if missing
 * @param {{ start: string, end: string }} params.schedule  // "HH:mm" 24hr format
 * @returns {{
 *   regularHrs: number,
 *   ot: number,
 *   nd: number,
 *   lateMinutes: number,
 *   undertimeMinutes: number,
 *   incomplete: boolean
 * }}
 */
export function computeDailySummary({ punchIn, punchOut, schedule }) {
  const [startH, startM] = schedule.start.split(":").map(Number);
  const [endH, endM] = schedule.end.split(":").map(Number);

  // 1. Anchor schedule start relative to punchIn date.
  // We check previous, same, and next day to find the shift start closest to the actual punchIn.
  const sameDayStart = setTimeOnDate(punchIn, startH, startM);
  
  const prevDayStart = new Date(sameDayStart);
  prevDayStart.setDate(prevDayStart.getDate() - 1);
  
  const nextDayStart = new Date(sameDayStart);
  nextDayStart.setDate(nextDayStart.getDate() + 1);

  const diffSame = Math.abs(punchIn.getTime() - sameDayStart.getTime());
  const diffPrev = Math.abs(punchIn.getTime() - prevDayStart.getTime());
  const diffNext = Math.abs(punchIn.getTime() - nextDayStart.getTime());

  let schedStart = sameDayStart;
  let minDiff = diffSame;

  if (diffPrev < minDiff) {
    schedStart = prevDayStart;
    minDiff = diffPrev;
  }
  if (diffNext < minDiff) {
    schedStart = nextDayStart;
  }

  // 2. Compute scheduled end
  const schedEnd = new Date(schedStart);
  if (endH < startH || (endH === startH && endM < startM)) {
    // Overnight shift crossing midnight
    schedEnd.setDate(schedEnd.getDate() + 1);
  }
  schedEnd.setHours(endH, endM, 0, 0);

  // 3. Late minutes (independent of punchOut existence or validity)
  let lateMinutes = 0;
  if (punchIn.getTime() > schedStart.getTime()) {
    lateMinutes = Math.floor((punchIn.getTime() - schedStart.getTime()) / (1000 * 60));
  }

  // 4. Handle missing, invalid, or out-of-order punchOut defensively
  const isPunchOutMissing = !punchOut;
  const isPunchOutBeforePunchIn = punchOut && punchOut.getTime() < punchIn.getTime();

  if (isPunchOutMissing || isPunchOutBeforePunchIn) {
    return {
      regularHrs: 0.00,
      ot: 0.00,
      nd: 0.00,
      lateMinutes,
      undertimeMinutes: 0,
      incomplete: true
    };
  }

  // 5. Normal computation when punchOut is valid and present
  const scheduledDuration = (schedEnd.getTime() - schedStart.getTime()) / (1000 * 60 * 60);
  const actualWorked = (punchOut.getTime() - punchIn.getTime()) / (1000 * 60 * 60);

  // Overtime (hours)
  let ot = 0;
  const otStart = new Date(Math.max(punchIn.getTime(), schedEnd.getTime()));
  if (punchOut.getTime() > otStart.getTime()) {
    ot = (punchOut.getTime() - otStart.getTime()) / (1000 * 60 * 60);
  }

  // Undertime (minutes)
  let undertimeMinutes = 0;
  if (punchOut.getTime() < schedEnd.getTime()) {
    undertimeMinutes = Math.floor((schedEnd.getTime() - punchOut.getTime()) / (1000 * 60));
  }

  // Regular Hours (capped at scheduled shift duration, and total hours = regular + ot)
  const regularHrs = Math.max(0, Math.min(actualWorked - ot, scheduledDuration));

  // Night Differential (hours) - worked time falling in 22:00 to 06:00
  const baseDate = new Date(punchIn.getFullYear(), punchIn.getMonth(), punchIn.getDate());
  
  const prevDay = new Date(baseDate);
  prevDay.setDate(prevDay.getDate() - 1);
  
  const nextDay = new Date(baseDate);
  nextDay.setDate(nextDay.getDate() + 1);
  
  const dayAfterNext = new Date(baseDate);
  dayAfterNext.setDate(dayAfterNext.getDate() + 2);

  const ndWindows = [
    {
      start: setTimeOnDate(prevDay, 22, 0),
      end: setTimeOnDate(baseDate, 6, 0)
    },
    {
      start: setTimeOnDate(baseDate, 22, 0),
      end: setTimeOnDate(nextDay, 6, 0)
    },
    {
      start: setTimeOnDate(nextDay, 22, 0),
      end: setTimeOnDate(dayAfterNext, 6, 0)
    }
  ];

  let nd = 0;
  for (const window of ndWindows) {
    nd += getOverlapHours(punchIn, punchOut, window.start, window.end);
  }

  return {
    regularHrs: Number(regularHrs.toFixed(2)),
    ot: Number(ot.toFixed(2)),
    nd: Number(nd.toFixed(2)),
    lateMinutes,
    undertimeMinutes,
    incomplete: false
  };
}
