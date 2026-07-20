const prisma = require('../config/db');

async function listAssets(req, res) {
  const { departmentId, category, status, search } = req.query;

  const where = {
    ...(departmentId ? { departmentId } : {}),
    ...(category ? { category } : {}),
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
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: {
      department: true,
      owner: true,
      maintenanceSchedules: {
        include: { responsible: true, history: { orderBy: { performedAt: 'desc' } } },
        orderBy: { nextDueDate: 'asc' },
      },
    },
  });

  if (!asset) return res.status(404).json({ error: 'Asset negasit.' });
  res.json(asset);
}

async function createAsset(req, res) {
  try {
    const { name, internalCode, category, location, description, purchaseDate, departmentId, ownerId } = req.body;

    if (!name || !internalCode || !category) {
      return res.status(400).json({ error: 'name, internalCode si category sunt obligatorii.' });
    }
    if (!departmentId) {
      return res.status(400).json({ error: 'departmentId (departamentul responsabil) este obligatoriu.' });
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        internalCode,
        category,
        location,
        description,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        departmentId: departmentId || null,
        ownerId: ownerId || null,
      },
    });

    res.status(201).json(asset);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Exista deja un asset cu acest cod intern.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare la crearea asset-ului.' });
  }
}

async function updateAsset(req, res) {
  try {
    const { name, category, location, description, status, departmentId, ownerId, purchaseDate } = req.body;

    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(ownerId !== undefined ? { ownerId } : {}),
        ...(purchaseDate !== undefined ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null } : {}),
      },
    });

    res.json(asset);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la actualizarea asset-ului.' });
  }
}

async function deleteAsset(req, res) {
  try {
    await prisma.asset.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la stergerea asset-ului.' });
  }
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset };
