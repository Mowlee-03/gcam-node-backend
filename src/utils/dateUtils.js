// utils/dateUtils.js

/**
 * Validate if string is in YYYY-MM-DD format
 */
function isValidDateString(dateStr) {
  return /^\d{4}-\d{2}-\d{2}$/.test(dateStr);
}

/**
 * Convert IST date string (YYYY-MM-DD) into UTC start & end range
 */
function getUTCRangeFromISTDate(dateStr) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  // JS automatically handles UTC conversion when given +05:30
  const startUTC = new Date(`${dateStr}T00:00:00+05:30`);
  const endUTC   = new Date(`${dateStr}T23:59:59+05:30`);

  return { startUTC, endUTC };
}


/**
 * Convert a UTC Date object to IST Date object
 */
function convertUTCtoIST(date) {
  if (!(date instanceof Date)) throw new Error("Invalid date object");
  return new Date(date.getTime() + (5 * 60 + 30) * 60000); // +5:30 offset
}

/**
 * Convert IST Date object to UTC Date object
 */
function convertISTtoUTC(date) {
  if (!(date instanceof Date)) throw new Error("Invalid date object");
  return new Date(date.getTime() - (5 * 60 + 30) * 60000); // -5:30 offset
}

/**
 * Format Date to 'YYYY-MM-DD HH:mm:ss' in IST
 */
function formatDateIST(date) {
  if (!(date instanceof Date)) throw new Error("Invalid date object");
  const istDate = convertUTCtoIST(date);
  return istDate.toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Get today's UTC range
 */
function getTodayUTCRange() {
  const now = new Date();
  const startUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0));
  const endUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59));
  return { startUTC, endUTC };
}

/**
 * Get week UTC range (Monday -> Sunday) for a given IST date string
 */
function getWeekUTCRangeFromISTDate(dateStr) {
  if (!isValidDateString(dateStr)) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  const dateIST = new Date(`${dateStr}T00:00:00+05:30`);
  const day = dateIST.getDay(); // 0=Sunday, 1=Monday...
  const diffToMonday = (day === 0 ? -6 : 1 - day);

  const mondayIST = new Date(dateIST);
  mondayIST.setDate(dateIST.getDate() + diffToMonday);

  const sundayIST = new Date(mondayIST);
  sundayIST.setDate(mondayIST.getDate() + 6);
  sundayIST.setHours(23, 59, 59);

  return {
    startUTC: convertISTtoUTC(mondayIST),
    endUTC: convertISTtoUTC(sundayIST)
  };
}

/**
 * Get month UTC range for a given IST date string
 */
function getMonthUTCRangeFromISTDate(dateStr) {
  if (!isValidDateString(dateStr)) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  const dateIST = new Date(`${dateStr}T00:00:00+05:30`);
  const firstDayIST = new Date(dateIST.getFullYear(), dateIST.getMonth(), 1, 0, 0, 0);
  const lastDayIST = new Date(dateIST.getFullYear(), dateIST.getMonth() + 1, 0, 23, 59, 59);

  return {
    startUTC: convertISTtoUTC(firstDayIST),
    endUTC: convertISTtoUTC(lastDayIST)
  };
}

/**
 * Get UTC range for a custom IST date range
 * @param {string} startDateStr - YYYY-MM-DD
 * @param {string} endDateStr - YYYY-MM-DD
 * @returns {Object} { startUTC, endUTC }
 */
function getCustomUTCRangeFromISTDates(startDateStr, endDateStr) {
  if (!isValidDateString(startDateStr) || !isValidDateString(endDateStr)) {
    throw new Error("Invalid date format, expected YYYY-MM-DD");
  }

  const startIST = new Date(`${startDateStr}T00:00:00+05:30`);
  const endIST = new Date(`${endDateStr}T23:59:59+05:30`);

  return {
    startUTC: convertISTtoUTC(startIST),
    endUTC: convertISTtoUTC(endIST)
  };
}

module.exports = {
  isValidDateString,
  getUTCRangeFromISTDate,
  convertUTCtoIST,
  convertISTtoUTC,
  formatDateIST,
  getTodayUTCRange,
  getWeekUTCRangeFromISTDate,
  getMonthUTCRangeFromISTDate,
  getCustomUTCRangeFromISTDates
};
