const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, fullName: true, role: true, active: true,
      department: true, createdAt: true,
      moduleAccess: {
        select: {
          moduleId: true,
          module: {
            select: {
              code: true,
              name: true,
              active: true,
            },
          },
        },
      },
    },
    orderBy: { fullName: 'asc' },
  });
  res.json(users);
}

async function updateUser(req, res) {
  try {
    const { fullName, role, departmentId, active, password } = req.body;

    const data = {
      ...(fullName !== undefined ? { fullName } : {}),
      ...(role !== undefined ? { role } : {}),
      ...(departmentId !== undefined ? { departmentId } : {}),
      ...(active !== undefined ? { active } : {}),
    };

    if (password) {
      data.passwordHash = await bcrypt.hash(password, 10);
    }

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, fullName: true, role: true, active: true },
    });

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Eroare la actualizarea utilizatorului.' });
  }
}

async function updateUserModules(req, res) {
  try {
    const { moduleIds } = req.body || {};

    if (
      !Array.isArray(moduleIds) ||
      moduleIds.some(id => typeof id !== 'string' || !id.trim()) ||
      new Set(moduleIds).size !== moduleIds.length
    ) {
      return res.status(400).json({
        error: 'moduleIds trebuie sa fie o lista de ID-uri unice.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(404).json({ error: 'Utilizator negasit.' });
    }

    const validModules = await prisma.maintenanceModule.findMany({
      where: {
        id: { in: moduleIds },
        active: true,
      },
      select: { id: true },
    });

    if (validModules.length !== moduleIds.length) {
      return res.status(400).json({
        error: 'Unul sau mai multe module sunt invalide sau inactive.',
      });
    }

    await prisma.$transaction(async tx => {
      await tx.userModuleAccess.deleteMany({
        where: { userId: user.id },
      });

      if (moduleIds.length > 0) {
        await tx.userModuleAccess.createMany({
          data: moduleIds.map(moduleId => ({
            userId: user.id,
            moduleId,
          })),
        });
      }
    });

    const updated = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        email: true,
        fullName: true,
        role: true,
        moduleAccess: {
          select: {
            moduleId: true,
            module: {
              select: { code: true, name: true },
            },
          },
        },
      },
    });

    res.json(updated);
  } catch (err) {
    console.error('Eroare actualizare module utilizator:', err);
    res.status(500).json({
      error: 'Eroare la actualizarea modulelor utilizatorului.',
    });
  }
}

async function listModules(req, res) {
  try {
    const modules = await prisma.maintenanceModule.findMany({
      where: { active: true },
      select: {
        id: true,
        code: true,
        name: true,
      },
      orderBy: { name: 'asc' },
    });

    res.json(modules);
  } catch (err) {
    console.error('Eroare listare module:', err);
    res.status(500).json({ error: 'Eroare la obtinerea modulelor.' });
  }
}

async function listDepartments(req, res) {
  const departments = await prisma.department.findMany({ orderBy: { name: 'asc' } });
  res.json(departments);
}

async function createDepartment(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'name este obligatoriu.' });
    const dept = await prisma.department.create({ data: { name } });
    res.status(201).json(dept);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Departamentul exista deja.' });
    console.error(err);
    res.status(500).json({ error: 'Eroare la crearea departamentului.' });
  }
}

module.exports = { listUsers, updateUser, updateUserModules, listModules, listDepartments, createDepartment };
