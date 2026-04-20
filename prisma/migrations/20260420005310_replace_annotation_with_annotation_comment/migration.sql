/*
  Warnings:

  - You are about to drop the `Annotation` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AnnotationCommentType" AS ENUM ('HIGHLIGHT_PDF', 'HIGHLIGHT_EMAIL', 'DOCUMENT_NOTE', 'EMAIL_NOTE');

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_createdById_fkey";

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_documentId_fkey";

-- DropForeignKey
ALTER TABLE "Annotation" DROP CONSTRAINT "Annotation_tenantId_fkey";

-- DropTable
DROP TABLE "Annotation";

-- CreateTable
CREATE TABLE "AnnotationComment" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT,
    "messageId" TEXT,
    "parentId" TEXT,
    "type" "AnnotationCommentType" NOT NULL,
    "content" TEXT NOT NULL,
    "deletedAt" TIMESTAMP(3),
    "color" TEXT DEFAULT '#FFFF00',
    "pageNumber" INTEGER,
    "x" DOUBLE PRECISION,
    "y" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "selectedText" TEXT,
    "selectionStart" INTEGER,
    "selectionEnd" INTEGER,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AnnotationComment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AnnotationComment_tenantId_documentId_idx" ON "AnnotationComment"("tenantId", "documentId");

-- CreateIndex
CREATE INDEX "AnnotationComment_tenantId_messageId_idx" ON "AnnotationComment"("tenantId", "messageId");

-- CreateIndex
CREATE INDEX "AnnotationComment_tenantId_createdById_idx" ON "AnnotationComment"("tenantId", "createdById");

-- AddForeignKey
ALTER TABLE "AnnotationComment" ADD CONSTRAINT "AnnotationComment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationComment" ADD CONSTRAINT "AnnotationComment_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationComment" ADD CONSTRAINT "AnnotationComment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationComment" ADD CONSTRAINT "AnnotationComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AnnotationComment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AnnotationComment" ADD CONSTRAINT "AnnotationComment_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
