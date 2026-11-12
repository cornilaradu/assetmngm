const prisma = require('../config/db');

/**
 * Citeste utilizatorul si permisiunile actuale din baza de date.
 * Nu se bazeaza pe rolul stocat in JWT.
 */
async function getAccessContext(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      active: true,
      moduleAccess: {
        where: { module: { active: true } },
        select: { moduleId: true },
      },
    },
  });

  if (!user || !user.active) {
    return null;
  }

  return {
    userId: user.id,
    role: user.role,
    isAdmin: user.role === 'ADMIN',
    moduleIds: user.moduleAccess.map((access) => access.moduleId),
  };
}

/**
 * Filtru Prisma pentru asset-uri.
 * Administratorul poate vedea inclusiv asset-urile fara modul.
 */
function assetAccessWhere(access) {
  if (!access) {
    return { id: { in: [] } };
  }

  if (access.isAdmin) {
    return {};
  }

  return {
    moduleId: { in: access.moduleIds },
    module: { active: true },
  };
}

/**
 * Filtru Prisma pentru mentenante.
 * Modulul este mostenit de la asset.
 */
function scheduleAccessWhere(access) {
  return {
    asset: assetAccessWhere(access),
  };
}

/**
 * Verifica accesul la un anumit modul.
 */
function canAccessModule(access, moduleId) {
  if (!access) return false;
  if (access.isAdmin) return true;
  if (!moduleId) return false;

  return access.moduleIds.includes(moduleId);
}

module.exports = {
  getAccessContext,
  assetAccessWhere,
  scheduleAccessWhere,
  canAccessModule,
};
