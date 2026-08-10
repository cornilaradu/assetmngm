const prisma = require('../config/db');

async function listCategories(req, res) {
  const categories = await prisma.assetCategory.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { assets: true } } },
  });
  res.json(categories);
}

async function createCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Numele categoriei este obligatoriu.' });
    }
    const category = await prisma.assetCategory.create({ data: { name: name.trim() } });
    res.status(201).json(category);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Exista deja o categorie cu acest nume.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare la crearea categoriei.' });
  }
}

async function updateCategory(req, res) {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Numele categoriei este obligatoriu.' });
    }
    const category = await prisma.assetCategory.update({
      where: { id: req.params.id },
      data: { name: name.trim() },
    });
    res.json(category);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Exista deja o categorie cu acest nume.' });
    }
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria nu a fost gasita.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare la actualizarea categoriei.' });
  }
}

/**
 * Sterge o categorie. Asset-urile care o foloseau raman, dar cu categoria goala
 * (SetNull, configurat in schema) - nu se sterg si nu se blocheaza operatia.
 */
async function deleteCategory(req, res) {
  try {
    await prisma.assetCategory.delete({ where: { id: req.params.id } });
    res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Categoria nu a fost gasita.' });
    }
    console.error(err);
    res.status(500).json({ error: 'Eroare la stergerea categoriei.' });
  }
}

module.exports = { listCategories, createCategory, updateCategory, deleteCategory };
