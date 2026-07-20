const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../config/db');

async function register(req, res) {
  try {
    const { email, password, fullName, role, departmentId } = req.body;

    if (!email || !password || !fullName) {
      return res.status(400).json({ error: 'email, password si fullName sunt obligatorii.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: 'Exista deja un utilizator cu acest email.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        fullName,
        role: role || 'VIEWER',
        departmentId: departmentId || null,
      },
    });

    return res.status(201).json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Eroare la crearea utilizatorului.' });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Email sau parola incorecte.' });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Email sau parola incorecte.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, fullName: user.fullName },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
    );

    return res.json({
      token,
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Eroare la autentificare.' });
  }
}

async function changePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'currentPassword si newPassword sunt obligatorii.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Parola noua trebuie sa aiba cel putin 6 caractere.' });
    }

    const user = await prisma.user.findUnique({ where: { id: req.user.id } });
    if (!user) return res.status(404).json({ error: 'Utilizator negasit.' });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Parola curenta este incorecta.' });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: user.id }, data: { passwordHash } });

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Eroare la schimbarea parolei.' });
  }
}

async function me(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.id },
    select: { id: true, email: true, fullName: true, role: true, departmentId: true },
  });
  return res.json(user);
}

module.exports = { register, login, me, changePassword };
