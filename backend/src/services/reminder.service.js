const cron = require('node-cron');
const prisma = require('../config/db');
const { sendMaintenanceReminder } = require('./email.service');
const { daysUntil, computeStatus } = require('../utils/date');

/**
 * Parcurge toate schedule-urile active, recalculeaza statusul si trimite
 * email de reminder o singura data per scadenta (foloseste reminderSentAt
 * ca sa nu trimita acelasi reminder de mai multe ori pe zi).
 */
async function runReminderCheck() {
  const schedules = await prisma.maintenanceSchedule.findMany({
    where: { active: true },
    include: {
      asset: true,
      responsible: true,
    },
  });

  const results = { checked: schedules.length, emailsSent: 0, errors: 0 };

  for (const schedule of schedules) {
    const daysLeft = daysUntil(schedule.nextDueDate);
    const newStatus = computeStatus(schedule.nextDueDate, schedule.reminderDaysBefore);

    const shouldNotify = newStatus === 'DUE_SOON' || newStatus === 'OVERDUE';

    // Trimite reminder doar daca nu a fost deja trimis pentru aceasta scadenta
    // (verificam daca reminderSentAt e null sau e mai vechi decat ultima schimbare relevanta)
    const alreadyNotifiedToday =
      schedule.reminderSentAt &&
      new Date(schedule.reminderSentAt).toDateString() === new Date().toDateString();

    if (shouldNotify && schedule.responsible?.email && !alreadyNotifiedToday) {
      try {
        await sendMaintenanceReminder({
          to: schedule.responsible.email,
          cc: schedule.responsibleEmailCc || undefined,
          assetName: schedule.asset.name,
          assetCode: schedule.asset.internalCode,
          maintenanceType: schedule.maintenanceType,
          dueDate: schedule.nextDueDate,
          daysLeft,
          portalUrl: process.env.FRONTEND_URL,
        });
        results.emailsSent += 1;

        await prisma.maintenanceSchedule.update({
          where: { id: schedule.id },
          data: { reminderSentAt: new Date(), status: newStatus },
        });
      } catch (err) {
        console.error(`Eroare la trimiterea reminder-ului pentru schedule ${schedule.id}:`, err.message);
        results.errors += 1;
      }
    } else if (schedule.status !== newStatus) {
      // Actualizam statusul chiar daca nu trimitem email (ex: a devenit UPCOMING la loc dupa reprogramare)
      await prisma.maintenanceSchedule.update({
        where: { id: schedule.id },
        data: { status: newStatus },
      });
    }
  }

  return results;
}

/**
 * Porneste job-ul cron care ruleaza zilnic (ora configurabila din .env)
 */
function startReminderCron() {
  const schedule = process.env.REMINDER_CRON_SCHEDULE || '0 7 * * *';
  cron.schedule(schedule, async () => {
    console.log(`[reminder-cron] Rulez verificarea de mentenante la ${new Date().toISOString()}`);
    const result = await runReminderCheck();
    console.log('[reminder-cron] Rezultat:', result);
  });
  console.log(`[reminder-cron] Programat cu schedule-ul cron: "${schedule}"`);
}

module.exports = { startReminderCron, runReminderCheck };
