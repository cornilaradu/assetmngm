const prisma = require('../config/db');
const { computeStatus } = require('../utils/date');

async function getNotifications(req, res) {
  try {
    const userId = req.user.id;

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: { active: true },
      include: {
        asset: { select: { id: true, name: true } },
      },
      orderBy: { nextDueDate: 'asc' },
    });

    const alerts = schedules
      .map((schedule) => ({
        ...schedule,
        status: computeStatus(
          schedule.nextDueDate,
          schedule.reminderDaysBefore
        ),
      }))
      .filter((schedule) =>
        ['OVERDUE', 'DUE_SOON'].includes(schedule.status)
      );

    const reads = await prisma.notificationRead.findMany({
      where: {
        userId,
        scheduleId: { in: alerts.map((s) => s.id) },
      },
    });

    const notifications = alerts.map((schedule) => {
      const read = reads.find(
        (r) =>
          r.scheduleId === schedule.id &&
          r.status === schedule.status &&
          r.dueDate.getTime() === schedule.nextDueDate.getTime()
      );

      return {
        id: schedule.id,
        scheduleId: schedule.id,
        asset: schedule.asset,
        maintenanceType: schedule.maintenanceType,
        status: schedule.status,
        dueDate: schedule.nextDueDate,
        isRead: Boolean(read),
        readAt: read?.readAt || null,
      };
    });

    res.json({
      unreadCount: notifications.filter((n) => !n.isRead).length,
      notifications,
    });
  } catch (err) {
    console.error('Eroare notificari:', err);
    res.status(500).json({ error: 'Eroare la obtinerea notificarilor.' });
  }
}

async function markNotificationRead(req, res) {
  try {
    const userId = req.user.id;
    const { scheduleId, status, dueDate } = req.body;

    if (!scheduleId || !status || !dueDate) {
      return res.status(400).json({
        error: 'scheduleId, status si dueDate sunt obligatorii.',
      });
    }

    if (!['OVERDUE', 'DUE_SOON'].includes(status)) {
      return res.status(400).json({ error: 'Status invalid.' });
    }

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: scheduleId },
    });

    if (!schedule || !schedule.active) {
      return res.status(404).json({
        error: 'Mentenanta activa nu a fost gasita.',
      });
    }

    const currentStatus = computeStatus(
      schedule.nextDueDate,
      schedule.reminderDaysBefore
    );

    const requestedDate = new Date(dueDate);

    if (
      Number.isNaN(requestedDate.getTime()) ||
      currentStatus !== status ||
      requestedDate.getTime() !== schedule.nextDueDate.getTime()
    ) {
      return res.status(409).json({
        error: 'Notificarea nu mai este actuala. Reincarcati lista.',
      });
    }

    const notification = await prisma.notificationRead.upsert({
      where: {
        userId_scheduleId_status_dueDate: {
          userId,
          scheduleId,
          status,
          dueDate: schedule.nextDueDate,
        },
      },
      update: {},
      create: {
        userId,
        scheduleId,
        status,
        dueDate: schedule.nextDueDate,
      },
    });

    res.json({ success: true, notification });
  } catch (err) {
    console.error('Eroare marcare notificare:', err);
    res.status(500).json({
      error: 'Eroare la marcarea notificarii ca citita.',
    });
  }
}

module.exports = { getNotifications, markNotificationRead };
