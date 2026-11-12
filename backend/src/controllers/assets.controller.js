const prisma = require('../config/db');
const { assetAccessWhere, canAccessModule } = require('../services/module-access.service');

async function listAssets(req, res) {
  const { departmentId, categoryId, status, search, moduleId } = req.query;

  const where = {
    ...assetAccessWhere(req.moduleAccess),
    ...(moduleId ? { moduleId } : {}),
    ...(departmentId ? { departmentId } : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' } },
            { internalCode: { contains: search, mode: 'insensitive' } },
          ],
        }
      : {}),
  };

  const assets = await prisma.asset.findMany({
    where,
    include: {
      department: true,
      categoryRef: true,
      owner: { select: { id: true, fullName: true, email: true } },
      maintenanceSchedules: {
        where: { active: true },
        orderBy: { nextDueDate: 'asc' },
      },
    },
    orderBy: { name: 'asc' },
  });

  res.json(assets);
}

async function getAsset(req, res) {
  const asset = await prisma.asset.findFirst({
    where: {
      id: req.params.id,
      ...assetAccessWhere(req.moduleAccess),
    },
    include: {
      department: true,
      categoryRef: true,
      owner: { select: { id: true, fullName: true, email: true } },
      maintenanceSchedules: {
        include: {
          responsible: { select: { id: true, fullName: true, email: true } },
          history: { orderBy: { performedAt: 'desc' }, include: { documents: true } },
        },
        orderBy: { nextDueDate: 'asc' },
      },
    },
  });

  if (!asset) return res.status(404).json({ error: 'Asset negasit.' });
  res.json(asset);
}

async function createAsset(req, res) {
  try {
    const { name, internalCode, categoryId, location, description, purchaseDate, departmentId, ownerId, moduleId } = req.body;

    if (!name || !internalCode) {
      return res.status(400).json({ error: 'name si internalCode sunt obligatorii.' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId (categoria asset-ului) este obligatorie.' });
    }
    if (!departmentId) {
      return res.status(400).json({ error: 'departmentId (departamentul responsabil) este obligatoriu.' });
    }

    if (!moduleId || typeof moduleId !== 'string') {
      return res.status(400).json({ error: 'Selectarea modulului este obligatorie.' });
    }

    const moduleRecord = await prisma.maintenanceModule.findUnique({
      where: { id: moduleId },
    });

    if (!moduleRecord || !moduleRecord.active) {
      return res.status(400).json({ error: 'Modul invalid sau inactiv.' });
    }

    if (!canAccessModule(req.moduleAccess, moduleId)) {
      return res.status(403).json({ error: 'Nu aveti acces la acest modul.' });
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        internalCode,
        moduleId,
        categoryId,
        location,
        description,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        departmentId: departmentId || null,
        ownerId: ownerId || null,
      },
      include: { categoryRef: true, department: true },
    });

    res.status(201).json(asset);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Exista deja un asset cu acest cod intern.' });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Categoria sau departamentul selectat nu exista.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare la crearea asset-ului.' });
  }
}

async function updateAsset(req, res) {
  try {
    const { name, categoryId, location, description, status, departmentId, ownerId, purchaseDate, moduleId } = req.body;

    const existingAsset = await prisma.asset.findFirst({
      where: {
        id: req.params.id,
        ...assetAccessWhere(req.moduleAccess),
      },
      select: { id: true, moduleId: true },
    });

    if (!existingAsset) {
      return res.status(404).json({ error: 'Asset negasit.' });
    }

    if (moduleId !== undefined) {
      if (!moduleId || typeof moduleId !== 'string') {
        return res.status(400).json({ error: 'Modul invalid.' });
      }

      const targetModule = await prisma.maintenanceModule.findUnique({
        where: { id: moduleId },
      });

      if (!targetModule || !targetModule.active) {
        return res.status(400).json({ error: 'Modul invalid sau inactiv.' });
      }

      if (!canAccessModule(req.moduleAccess, moduleId)) {
        return res.status(403).json({ error: 'Nu aveti acces la modulul selectat.' });
      }
    }

    const result = await prisma.asset.updateMany({
      where: {
        id: req.params.id,
        ...assetAccessWhere(req.moduleAccess),
      },
      data: {
        ...(moduleId !== undefined ? { moduleId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(ownerId !== undefined ? { ownerId } : {}),
        ...(purchaseDate !== undefined ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null } : {}),
      },
    });

    if (result.count === 0) {
      return res.status(404).json({
        error: 'Asset negasit sau fara acces la modulul acestuia.',
      });
    }

    const asset = await prisma.asset.findUnique({
      where: { id: req.params.id },
      include: { categoryRef: true, department: true },
    });

    res.json(asset);
  } catch (err) {
    if (err.code === 'P2003') {
      return res.status(400).json({ error: 'Categoria sau departamentul selectat nu exista.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare la actualizarea asset-ului.' });
  }
}

async function deleteAsset(req, res) {
  try {
    const historyCount = await prisma.maintenanceHistory.count({
      where: {
        schedule: {
          assetId: req.params.id,
        },
      },
    });

    if (historyCount > 0) {
      return res.status(409).json({
        error: 'Asset-ul are istoric de mentenanta si nu poate fi sters. Folositi statusul RETIRED.',
      });
    }

    await prisma.asset.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la stergerea asset-ului.' });
  }
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset };
