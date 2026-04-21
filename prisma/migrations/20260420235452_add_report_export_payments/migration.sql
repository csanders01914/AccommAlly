-- CreateEnum
CREATE TYPE "ReportExportPaymentStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED');

-- CreateTable
CREATE TABLE "ReportExportPayment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stripePaymentIntentIdEnc" TEXT NOT NULL,
    "amountCents" INTEGER NOT NULL,
    "pageCount" INTEGER NOT NULL,
    "status" "ReportExportPaymentStatus" NOT NULL DEFAULT 'PENDING',
    "exportedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ReportExportPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ReportExportPayment_tenantId_idx" ON "ReportExportPayment"("tenantId");

-- CreateIndex
CREATE INDEX "ReportExportPayment_userId_idx" ON "ReportExportPayment"("userId");

-- CreateIndex
CREATE INDEX "ReportExportPayment_status_idx" ON "ReportExportPayment"("status");

-- CreateIndex
CREATE INDEX "ReportExportPayment_createdAt_idx" ON "ReportExportPayment"("createdAt");

-- AddForeignKey
ALTER TABLE "ReportExportPayment" ADD CONSTRAINT "ReportExportPayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ReportExportPayment" ADD CONSTRAINT "ReportExportPayment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
