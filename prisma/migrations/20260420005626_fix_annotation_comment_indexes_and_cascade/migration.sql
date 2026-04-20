-- DropForeignKey
ALTER TABLE "AnnotationComment" DROP CONSTRAINT "AnnotationComment_parentId_fkey";

-- DropIndex
DROP INDEX "AnnotationComment_tenantId_documentId_idx";

-- DropIndex
DROP INDEX "AnnotationComment_tenantId_messageId_idx";

-- CreateIndex
CREATE INDEX "AnnotationComment_tenantId_documentId_deletedAt_idx" ON "AnnotationComment"("tenantId", "documentId", "deletedAt");

-- CreateIndex
CREATE INDEX "AnnotationComment_tenantId_messageId_deletedAt_idx" ON "AnnotationComment"("tenantId", "messageId", "deletedAt");

-- CreateIndex
CREATE INDEX "AnnotationComment_parentId_idx" ON "AnnotationComment"("parentId");

-- AddForeignKey
ALTER TABLE "AnnotationComment" ADD CONSTRAINT "AnnotationComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "AnnotationComment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
