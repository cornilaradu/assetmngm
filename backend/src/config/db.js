const { PrismaClient } = require('@prisma/client');

// Singleton Prisma Client - reutilizat in toata aplicatia
const prisma = new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});

module.exports = prisma;
