-- AlterTable
ALTER TABLE "Asset" ADD COLUMN     "moduleId" TEXT;

-- CreateTable
CREATE TABLE "MaintenanceModule" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MaintenanceModule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserModuleAccess" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "moduleId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserModuleAccess_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MaintenanceModule_code_key" ON "MaintenanceModule"("code");

-- CreateIndex
CREATE UNIQUE INDEX "UserModuleAccess_userId_moduleId_key" ON "UserModuleAccess"("userId", "moduleId");

-- AddForeignKey
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "MaintenanceModule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserModuleAccess" ADD CONSTRAINT "UserModuleAccess_moduleId_fkey" FOREIGN KEY ("moduleId") REFERENCES "MaintenanceModule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
