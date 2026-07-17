/** Adauga N zile la o data si returneaza un obiect Date nou */
function addDays(date, days) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Numarul de zile (poate fi negativ) intre acum si o data data */
function daysUntil(date) {
  const now = new Date();
  const diffMs = new Date(date).getTime() - now.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
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
