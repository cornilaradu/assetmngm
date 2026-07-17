const prisma = require('../config/db');
const bcrypt = require('bcryptjs');

async function listUsers(req, res) {
  const users = await prisma.user.findMany({
    select: {
      id: true, email: true, fullName: true, role: true, active: true,
      department: true, createdAt: true,
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

module.exports = { listUsers, updateUser, listDepartments, createDepartment };
