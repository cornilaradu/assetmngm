const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const department = await prisma.department.upsert({
    where: { name: 'Mentenanta Generala' },
    update: {},
    create: { name: 'Mentenanta Generala' },
  });

  const passwordHash = await bcrypt.hash('Admin123!', 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@compania.ro' },
    update: {},
    create: {
      email: 'admin@compania.ro',
      passwordHash,
      fullName: 'Administrator Portal',
      role: 'ADMIN',
      departmentId: department.id,
    },
  });

  const asset = await prisma.asset.upsert({
    where: { internalCode: 'AST-0001' },
    update: {},
    create: {
      name: 'Centrala termica cladire A',
      internalCode: 'AST-0001',
      category: 'HVAC',
      location: 'Subsol cladire A',
      departmentId: department.id,
      ownerId: admin.id,
    },
  });

  const nextDue = new Date();
  nextDue.setDate(nextDue.getDate() + 10);

  await prisma.maintenanceSchedule.upsert({
    where: { id: 'seed-schedule-1' },
    update: {},
    create: {
      id: 'seed-schedule-1',
      assetId: asset.id,
      maintenanceType: 'Revizie tehnica anuala',
      recurrenceDays: 365,
      nextDueDate: nextDue,
      reminderDaysBefore: 14,
      responsibleId: admin.id,
      status: 'UPCOMING',
    },
  });

  console.log('Seed complet.');
  console.log('Login admin -> email: admin@compania.ro | parola: Admin123!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
