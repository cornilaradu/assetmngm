const prisma = require('../config/db');
const { scheduleAccessWhere, assetAccessWhere } = require('../services/module-access.service');
const { addDays, computeStatus } = require('../utils/date');
const fs = require('fs');
const path = require('path');
const { getUploadRoot } = require('../middleware/upload');

/**
 * Listeaza toate schedule-urile, cu filtre utile pentru dashboard:
 * ?status=OVERDUE|DUE_SOON|UPCOMING|DONE
 * ?responsibleId=...
 * ?assetId=...
 */
async function listSchedules(req, res) {
  try {
    const { status, responsibleId, assetId, moduleId } = req.query;

    if (moduleId !== undefined &&
        (typeof moduleId !== 'string' || !moduleId.trim())) {
      return res.status(400).json({ error: 'moduleId invalid.' });
    }

    const schedules = await prisma.maintenanceSchedule.findMany({
      where: {
        ...scheduleAccessWhere(req.moduleAccess),
        ...(moduleId ? { asset: {
          ...scheduleAccessWhere(req.moduleAccess).asset,
          moduleId,
        } } : {}),
        active: true,
        ...(responsibleId ? { responsibleId } : {}),
        ...(assetId ? { assetId } : {}),
      },
      include: {
        asset: true,
        responsible: {
          select: { id: true, fullName: true, email: true },
        },
      },
      orderBy: { nextDueDate: 'asc' },
    });

    const updatedSchedules = schedules.map((schedule) => ({
      ...schedule,
      status: computeStatus(
        schedule.nextDueDate,
        schedule.reminderDaysBefore
      ),
    }));

    const filteredSchedules = status
      ? updatedSchedules.filter((schedule) => schedule.status === status)
      : updatedSchedules;

    res.json(filteredSchedules);
  } catch (err) {
    console.error('Eroare la listarea mentenantelor:', err);
    res.status(500).json({
      error: 'Eroare la obtinerea mentenantelor.',
    });
  }
}

async function createSchedule(req, res) {
  try {
    const {
      assetId,
      maintenanceType,
      description,
      recurrenceDays,
      firstDueDate,
      reminderDaysBefore,
      responsibleId,
      responsibleEmailCc,
    } = req.body;

    if (!assetId || !maintenanceType || !firstDueDate) {
      return res.status(400).json({ error: 'assetId, maintenanceType si firstDueDate sunt obligatorii.' });
    }

    const asset = await prisma.asset.findFirst({
      where: {
        id: assetId,
        ...assetAccessWhere(req.moduleAccess),
      },
      select: { id: true },
    });

    if (!asset) {
      return res.status(404).json({
        error: 'Asset negasit sau fara acces la modulul acestuia.',
      });
    }

    const nextDueDate = new Date(firstDueDate);
    const reminderDays = reminderDaysBefore ?? Number(process.env.DEFAULT_REMINDER_DAYS_BEFORE || 7);

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId,
        maintenanceType,
        description,
        recurrenceDays: recurrenceDays ?? 0,
        nextDueDate,
        reminderDaysBefore: reminderDays,
        responsibleId: responsibleId || null,
        responsibleEmailCc: responsibleEmailCc || null,
        status: computeStatus(nextDueDate, reminderDays),
      },
    });

    res.status(201).json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la crearea programului de mentenanta.' });
  }
}

async function updateSchedule(req, res) {
  try {
    const {
      maintenanceType,
      description,
      recurrenceDays,
      nextDueDate,
      reminderDaysBefore,
      responsibleId,
      responsibleEmailCc,
      active,
    } = req.body;

    const existing = await prisma.maintenanceSchedule.findFirst({
      where: {
        id: req.params.id,
        ...scheduleAccessWhere(req.moduleAccess),
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: 'Mentenanta negasita sau fara acces.',
      });
    }

    if (nextDueDate !== undefined &&
        (!nextDueDate || Number.isNaN(new Date(nextDueDate).getTime()))) {
      return res.status(400).json({ error: 'Data scadentei este invalida.' });
    }

    for (const [field, value] of [
      ['recurrenceDays', recurrenceDays],
      ['reminderDaysBefore', reminderDaysBefore],
    ]) {
      if (value !== undefined &&
          (!Number.isInteger(value) || value < 0)) {
        return res.status(400).json({ error: field + ' invalid.' });
      }
    }

    const data = {
      ...(maintenanceType !== undefined ? { maintenanceType } : {}),
      ...(description !== undefined ? { description } : {}),
      ...(recurrenceDays !== undefined ? { recurrenceDays } : {}),
      ...(reminderDaysBefore !== undefined ? { reminderDaysBefore } : {}),
      ...(responsibleId !== undefined ? { responsibleId } : {}),
      ...(responsibleEmailCc !== undefined ? { responsibleEmailCc } : {}),
      ...(active !== undefined ? { active } : {}),
    };

    if (nextDueDate !== undefined) {
      data.nextDueDate = new Date(nextDueDate);
      data.reminderSentAt = null; // resetam ca reminder-ul sa poata fi trimis din nou pt noua scadenta
    }

    if (nextDueDate !== undefined || reminderDaysBefore !== undefined) {
      data.status = computeStatus(
        data.nextDueDate || existing.nextDueDate,
        reminderDaysBefore ?? existing.reminderDaysBefore
      );
    }

    const result = await prisma.maintenanceSchedule.updateMany({
      where: {
        id: req.params.id,
        ...scheduleAccessWhere(req.moduleAccess),
      },
      data,
    });

    if (result.count === 0) {
      return res.status(404).json({
        error: 'Mentenanta negasita sau fara acces la modulul acesteia.',
      });
    }

    const schedule = await prisma.maintenanceSchedule.findUnique({
      where: { id: req.params.id },
    });

    res.json(schedule);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la actualizarea programului de mentenanta.' });
  }
}

/**
 * Marcheaza o mentenanta ca fiind efectuata:
 * - CERE cel putin un document atasat (certificat/raport de service etc.) - fara el, refuza
 * - salveaza o intrare in istoric + documentele atasate
 * - calculeaza urmatoarea scadenta (nextDueDate + recurrenceDays)
 * - reseteaza reminderSentAt si statusul
 *
 * Foloseste multipart/form-data: campuri text (performedAt, performedBy, notes)
 * + fisiere sub campul "documents" (unul sau mai multe).
 */
async function markAsPerformed(req, res) {
  try {
    const { performedAt, performedBy, notes } = req.body;
    const scheduleId = req.params.id;
    const files = req.files || [];

    if (files.length === 0) {
      return res.status(400).json({
        error: 'Este obligatoriu sa atasezi cel putin un document (certificat, raport de service etc.) pentru a marca mentenanta ca efectuata.',
      });
    }

    const schedule = await prisma.maintenanceSchedule.findFirst({
      where: {
        id: scheduleId,
        ...scheduleAccessWhere(req.moduleAccess),
      },
    });

    if (!schedule) {
      return res.status(404).json({
        error: 'Mentenanta negasita sau fara acces la modulul acesteia.',
      });
    }

    const performedDate = performedAt ? new Date(performedAt) : new Date();
    const uploadRoot = getUploadRoot();

    const history = await prisma.maintenanceHistory.create({
      data: {
        scheduleId,
        performedAt: performedDate,
        performedBy: performedBy || req.user?.fullName || null,
        notes: notes || null,
        documents: {
          create: files.map((f) => ({
            fileName: f.originalname,
            storedName: f.filename,
            filePath: path.relative(uploadRoot, f.path),
            fileSize: f.size,
            mimeType: f.mimetype,
          })),
        },
      },
      include: { documents: true },
    });

    const isRecurring = schedule.recurrenceDays > 0;
    const nextDueDate = isRecurring ? addDays(performedDate, schedule.recurrenceDays) : performedDate;

    const updated = await prisma.maintenanceSchedule.update({
      where: { id: scheduleId },
      data: {
        lastPerformedAt: performedDate,
        nextDueDate,
        reminderSentAt: null,
        status: isRecurring ? computeStatus(nextDueDate, schedule.reminderDaysBefore) : 'DONE',
        active: isRecurring, // daca nu e recurenta, o dezactivam dupa finalizare
      },
    });

    res.json({ schedule: updated, history });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la marcarea mentenantei ca efectuata.' });
  }
}

/**
 * Descarca un document de mentenanta atasat (necesita autentificare, verificata in ruta).
 */
async function downloadDocument(req, res) {
  try {
    const doc = await prisma.maintenanceDocument.findUnique({
      where: { id: req.params.docId },
      include: {
        history: {
          include: {
            schedule: {
              include: {
                asset: {
                  select: { moduleId: true, module: { select: { active: true } } },
                },
              },
            },
          },
        },
      },
    });
    if (!doc) return res.status(404).json({ error: 'Documentul nu a fost gasit.' });

    const asset = doc.history?.schedule?.asset;
    const access = req.moduleAccess;

    if (
      !asset ||
      !access ||
      (!access.isAdmin && (
        !asset.module?.active ||
        !access.moduleIds.includes(asset.moduleId)
      ))
    ) {
      return res.status(404).json({
        error: 'Document negasit sau fara acces la modulul acestuia.',
      });
    }

    const fullPath = path.join(getUploadRoot(), doc.filePath);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ error: 'Fisierul nu mai exista pe server.' });
    }

    res.download(fullPath, doc.fileName);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la descarcarea documentului.' });
  }
}

async function deleteSchedule(req, res) {
  try {
    const result = await prisma.maintenanceSchedule.deleteMany({
      where: {
        id: req.params.id,
        ...scheduleAccessWhere(req.moduleAccess),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        error: 'Mentenanta negasita sau fara acces la modulul acesteia.',
      });
    }

    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la stergerea programului de mentenanta.' });
  }
}

module.exports = { listSchedules, createSchedule, updateSchedule, markAsPerformed, deleteSchedule, downloadDocument };
