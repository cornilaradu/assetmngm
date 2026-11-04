/** Adauga N zile la o data si returneaza un obiect Date nou */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Numarul de zile (poate fi negativ) intre acum si o data data */
function daysUntil(date) {
  const now = new Date();
  const due = new Date(date);

  const todayUTC = Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate()
  );

  const dueUTC = Date.UTC(
    due.getFullYear(),
    due.getMonth(),
    due.getDate()
  );

  return Math.round((dueUTC - todayUTC) / 86400000);
}

/**
 * Calculeaza statusul unei mentenante in functie de nextDueDate si reminderDaysBefore
 */
function computeStatus(nextDueDate, reminderDaysBefore) {
  const days = daysUntil(nextDueDate);
  if (days < 0) return 'OVERDUE';
  if (days <= reminderDaysBefore) return 'DUE_SOON';
  return 'UPCOMING';
}

module.exports = { addDays, daysUntil, computeStatus };
