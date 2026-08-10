const prisma = require('../config/db');

async function listAssets(req, res) {
  const { departmentId, categoryId, status, search } = req.query;

  const where = {
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
  const asset = await prisma.asset.findUnique({
    where: { id: req.params.id },
    include: {
      department: true,
      categoryRef: true,
      owner: true,
      maintenanceSchedules: {
        include: {
          responsible: true,
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
    const { name, internalCode, categoryId, location, description, purchaseDate, departmentId, ownerId } = req.body;

    if (!name || !internalCode) {
      return res.status(400).json({ error: 'name si internalCode sunt obligatorii.' });
    }
    if (!categoryId) {
      return res.status(400).json({ error: 'categoryId (categoria asset-ului) este obligatorie.' });
    }
    if (!departmentId) {
      return res.status(400).json({ error: 'departmentId (departamentul responsabil) este obligatoriu.' });
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        internalCode,
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
    const { name, categoryId, location, description, status, departmentId, ownerId, purchaseDate } = req.body;

    const asset = await prisma.asset.update({
      where: { id: req.params.id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(categoryId !== undefined ? { categoryId: categoryId || null } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(departmentId !== undefined ? { departmentId } : {}),
        ...(ownerId !== undefined ? { ownerId } : {}),
        ...(purchaseDate !== undefined ? { purchaseDate: purchaseDate ? new Date(purchaseDate) : null } : {}),
      },
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
    await prisma.asset.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la stergerea asset-ului.' });
  }
}

module.exports = { listAssets, getAsset, createAsset, updateAsset, deleteAsset };
