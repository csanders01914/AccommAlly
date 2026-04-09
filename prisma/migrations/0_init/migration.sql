-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "public"."AccommodationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'VOID', 'RESCINDED');

-- CreateEnum
CREATE TYPE "public"."AccommodationType" AS ENUM ('CHANGE_IN_FUNCTIONS', 'ENVIRONMENTAL_MODIFICATION', 'JOB_AID', 'LEAVE_OF_ABSENCE', 'PHYSICAL_ACCOMMODATION', 'SCHEDULE_MODIFICATION');

-- CreateEnum
CREATE TYPE "public"."CaseStatus" AS ENUM ('OPEN', 'IN_PROGRESS', 'PENDING_REVIEW', 'CLOSED', 'ARCHIVED', 'APPEAL');

-- CreateEnum
CREATE TYPE "public"."InventoryStatus" AS ENUM ('AVAILABLE', 'ASSIGNED', 'MAINTENANCE', 'RETIRED', 'LOST');

-- CreateEnum
CREATE TYPE "public"."LifecycleStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "public"."LifecycleSubstatus" AS ENUM ('PENDING', 'APPROVED', 'MEDICAL_NOT_SUBMITTED', 'NO_LONGER_NEEDED', 'UNABLE_TO_ACCOMMODATE', 'CANCELLED', 'INSUFFICIENT_MEDICAL');

-- CreateEnum
CREATE TYPE "public"."MeetingType" AS ENUM ('INTERACTIVE_DIALOGUE', 'FOLLOW_UP', 'CHECK_IN', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."Role" AS ENUM ('ADMIN', 'AUDITOR', 'COORDINATOR', 'PROGRAM_LEAD', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "public"."TaskCategory" AS ENUM ('MEETING', 'DEADLINE', 'FOLLOW_UP', 'DOCUMENTATION', 'OTHER');

-- CreateEnum
CREATE TYPE "public"."TaskStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "public"."TenantStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateTable
CREATE TABLE "public"."Accommodation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accommodationNumber" TEXT NOT NULL DEFAULT '001',
    "type" "public"."AccommodationType" NOT NULL,
    "subtype" TEXT,
    "description" TEXT NOT NULL,
    "status" "public"."AccommodationStatus" NOT NULL DEFAULT 'PENDING',
    "lifecycleStatus" "public"."LifecycleStatus" NOT NULL DEFAULT 'OPEN',
    "lifecycleSubstatus" "public"."LifecycleSubstatus" NOT NULL DEFAULT 'PENDING',
    "isLongTerm" BOOLEAN NOT NULL DEFAULT false,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "estimatedCost" DECIMAL(10,2),
    "actualCost" DECIMAL(10,2),
    "reviewDate" TIMESTAMP(3),
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "decisionDate" TIMESTAMP(3),
    "decisionMakerId" TEXT,
    "costCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,

    CONSTRAINT "Accommodation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Annotation" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "pageNumber" INTEGER NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#FFFF00',
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Annotation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."AuditLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "field" TEXT,
    "oldValue" TEXT,
    "newValue" TEXT,
    "metadata" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."BugReport" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "transactionId" TEXT,
    "subject" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "reporterName" TEXT NOT NULL,
    "reporterEmail" TEXT,
    "reporterPhone" TEXT,
    "contactMethod" TEXT,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "userId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BugReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."CallRequest" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phoneNumber" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "urgent" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "scheduledFor" TIMESTAMP(3),
    "caseId" TEXT NOT NULL,

    CONSTRAINT "CallRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Case" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseNumber" TEXT NOT NULL,
    "clientName" TEXT NOT NULL,
    "clientEmail" TEXT,
    "clientEmailHash" TEXT,
    "clientPhone" TEXT,
    "clientPhoneHash" TEXT,
    "clientBirthdate" TIMESTAMP(3),
    "title" TEXT NOT NULL,
    "description" TEXT,
    "medicalCondition" TEXT,
    "category" TEXT,
    "program" TEXT,
    "venue" TEXT,
    "preferredStartDate" TEXT,
    "jobTitle" TEXT,
    "jobFamily" TEXT,
    "requestDate" TIMESTAMP(3),
    "status" "public"."CaseStatus" NOT NULL DEFAULT 'OPEN',
    "priority" INTEGER NOT NULL DEFAULT 2,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "closedAt" TIMESTAMP(3),
    "createdById" TEXT NOT NULL,
    "clientId" TEXT,
    "claimantRef" TEXT,
    "claimFamilyId" TEXT,

    CONSTRAINT "Case_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ClaimFamily" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClaimFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Claimant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "claimantNumber" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "nameHash" TEXT NOT NULL,
    "birthdate" TIMESTAMP(3) NOT NULL,
    "email" TEXT,
    "emailHash" TEXT,
    "phone" TEXT,
    "phoneHash" TEXT,
    "pinHash" TEXT,
    "passphraseHash" TEXT,
    "credentialType" TEXT NOT NULL DEFAULT 'PIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Claimant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Client" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Contact" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "type" TEXT NOT NULL,
    "address" TEXT,
    "notes" TEXT,
    "caseId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Document" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileType" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "fileData" BYTEA NOT NULL,
    "documentControlNumber" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'OTHER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "uploadedById" TEXT NOT NULL,

    CONSTRAINT "Document_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ErrorLog" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT,
    "transactionId" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "stack" TEXT,
    "path" TEXT,
    "method" TEXT,
    "statusCode" INTEGER NOT NULL DEFAULT 500,
    "metadata" JSONB,
    "userId" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ErrorLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."IdentityVerification" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "caseId" TEXT NOT NULL,
    "noteId" TEXT,
    "verified" BOOLEAN NOT NULL,
    "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verifiedById" TEXT NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundRule" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "senderContains" TEXT,
    "senderEquals" TEXT,
    "subjectContains" TEXT,
    "contentContains" TEXT,
    "caseNumberContains" TEXT,
    "isExternal" BOOLEAN,
    "hasAttachment" BOOLEAN,
    "isHighPriority" BOOLEAN,
    "actionKeepInInbox" BOOLEAN NOT NULL DEFAULT false,
    "actionMarkAsRead" BOOLEAN NOT NULL DEFAULT false,
    "actionStar" BOOLEAN NOT NULL DEFAULT false,
    "actionArchive" BOOLEAN NOT NULL DEFAULT false,
    "actionSendEmailNotification" BOOLEAN NOT NULL DEFAULT false,
    "actionSendSMSNotification" BOOLEAN NOT NULL DEFAULT false,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InboundRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."InboundRuleFolder" (
    "ruleId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,

    CONSTRAINT "InboundRuleFolder_pkey" PRIMARY KEY ("ruleId","folderId")
);

-- CreateTable
CREATE TABLE "public"."InventoryItem" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "assetTag" TEXT NOT NULL,
    "serialNumber" TEXT,
    "category" TEXT NOT NULL,
    "status" "public"."InventoryStatus" NOT NULL DEFAULT 'AVAILABLE',
    "condition" TEXT NOT NULL DEFAULT 'GOOD',
    "purchaseDate" TIMESTAMP(3),
    "cost" DECIMAL(10,2),
    "supplier" TEXT,
    "assignedToUserId" TEXT,
    "assignedToCaseId" TEXT,
    "assignedDate" TIMESTAMP(3),
    "expectedReturnDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Meeting" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "allDay" BOOLEAN NOT NULL DEFAULT false,
    "color" TEXT NOT NULL DEFAULT '#3b82f6',
    "type" "public"."MeetingType" NOT NULL DEFAULT 'OTHER',
    "recurrenceRule" TEXT,
    "recurrenceEnd" TIMESTAMP(3),
    "parentId" TEXT,
    "caseId" TEXT,
    "organizerId" TEXT NOT NULL,
    "externalId" TEXT,
    "syncSource" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meeting_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MeetingAttendee" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "meetingId" TEXT NOT NULL,
    "userId" TEXT,
    "email" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDING',

    CONSTRAINT "MeetingAttendee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Message" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "inInbox" BOOLEAN NOT NULL DEFAULT true,
    "starred" BOOLEAN NOT NULL DEFAULT false,
    "archived" BOOLEAN NOT NULL DEFAULT false,
    "deletedBySender" BOOLEAN NOT NULL DEFAULT false,
    "deletedByRecipient" BOOLEAN NOT NULL DEFAULT false,
    "inTrash" BOOLEAN NOT NULL DEFAULT false,
    "inJunk" BOOLEAN NOT NULL DEFAULT false,
    "trashDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "senderId" TEXT,
    "recipientId" TEXT,
    "isExternal" BOOLEAN NOT NULL DEFAULT false,
    "externalEmail" TEXT,
    "externalEmailHash" TEXT,
    "externalName" TEXT,
    "direction" TEXT NOT NULL DEFAULT 'INTERNAL',
    "externalMessageId" TEXT,
    "caseId" TEXT,
    "replyToId" TEXT,
    "forwardedFromId" TEXT,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageFolder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "icon" TEXT,
    "position" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageFolder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."MessageFolderAssignment" (
    "id" TEXT NOT NULL,
    "messageId" TEXT NOT NULL,
    "folderId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MessageFolderAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Note" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "noteType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "parentId" TEXT,

    CONSTRAINT "Note_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Reminder" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'EMAIL',
    "triggerAt" TIMESTAMP(3) NOT NULL,
    "sent" BOOLEAN NOT NULL DEFAULT false,
    "meetingId" TEXT,
    "taskId" TEXT,
    "callId" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Reminder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SubscriptionPlan" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "maxUsers" INTEGER NOT NULL DEFAULT 5,
    "maxActiveClaims" INTEGER NOT NULL DEFAULT 10,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SuperAdmin" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLogin" TIMESTAMP(3),

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Task" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "public"."TaskStatus" NOT NULL DEFAULT 'PENDING',
    "priority" TEXT NOT NULL DEFAULT 'MEDIUM',
    "category" "public"."TaskCategory" NOT NULL DEFAULT 'OTHER',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "startTime" TIMESTAMP(3),
    "endTime" TIMESTAMP(3),
    "color" TEXT NOT NULL DEFAULT '#8b5cf6',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "caseId" TEXT NOT NULL,
    "assignedToId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."Tenant" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "domain" TEXT,
    "status" "public"."TenantStatus" NOT NULL DEFAULT 'ACTIVE',
    "plan" TEXT NOT NULL DEFAULT 'FREE',
    "settings" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "planId" TEXT,

    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."User" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailHash" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "role" "public"."Role" NOT NULL DEFAULT 'COORDINATOR',
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "username" TEXT,
    "pronouns" TEXT,
    "theme" TEXT NOT NULL DEFAULT 'system',
    "notifications" JSONB,
    "preferences" JSONB,
    "twoFactorSecret" TEXT,
    "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
    "twoFactorRecoveryCodes" TEXT[],
    "passwordHash" TEXT,
    "lastLogin" TIMESTAMP(3),
    "loginAttempts" INTEGER NOT NULL DEFAULT 0,
    "lockedUntil" TIMESTAMP(3),
    "emailSignature" TEXT,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Accommodation_caseId_accommodationNumber_key" ON "public"."Accommodation"("caseId" ASC, "accommodationNumber" ASC);

-- CreateIndex
CREATE INDEX "Accommodation_caseId_idx" ON "public"."Accommodation"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Accommodation_decisionMakerId_idx" ON "public"."Accommodation"("decisionMakerId" ASC);

-- CreateIndex
CREATE INDEX "Accommodation_status_idx" ON "public"."Accommodation"("status" ASC);

-- CreateIndex
CREATE INDEX "Accommodation_tenantId_idx" ON "public"."Accommodation"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Annotation_createdById_idx" ON "public"."Annotation"("createdById" ASC);

-- CreateIndex
CREATE INDEX "Annotation_documentId_idx" ON "public"."Annotation"("documentId" ASC);

-- CreateIndex
CREATE INDEX "Annotation_tenantId_idx" ON "public"."Annotation"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_action_idx" ON "public"."AuditLog"("action" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "public"."AuditLog"("entityType" ASC, "entityId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_tenantId_idx" ON "public"."AuditLog"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_timestamp_idx" ON "public"."AuditLog"("timestamp" ASC);

-- CreateIndex
CREATE INDEX "AuditLog_userId_idx" ON "public"."AuditLog"("userId" ASC);

-- CreateIndex
CREATE INDEX "BugReport_status_idx" ON "public"."BugReport"("status" ASC);

-- CreateIndex
CREATE INDEX "BugReport_tenantId_idx" ON "public"."BugReport"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "BugReport_transactionId_idx" ON "public"."BugReport"("transactionId" ASC);

-- CreateIndex
CREATE INDEX "BugReport_userId_idx" ON "public"."BugReport"("userId" ASC);

-- CreateIndex
CREATE INDEX "CallRequest_status_idx" ON "public"."CallRequest"("status" ASC);

-- CreateIndex
CREATE INDEX "CallRequest_tenantId_idx" ON "public"."CallRequest"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "CallRequest_urgent_idx" ON "public"."CallRequest"("urgent" ASC);

-- CreateIndex
CREATE INDEX "Case_caseNumber_idx" ON "public"."Case"("caseNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Case_caseNumber_key" ON "public"."Case"("caseNumber" ASC);

-- CreateIndex
CREATE INDEX "Case_claimFamilyId_idx" ON "public"."Case"("claimFamilyId" ASC);

-- CreateIndex
CREATE INDEX "Case_claimantRef_idx" ON "public"."Case"("claimantRef" ASC);

-- CreateIndex
CREATE INDEX "Case_clientId_idx" ON "public"."Case"("clientId" ASC);

-- CreateIndex
CREATE INDEX "Case_clientName_idx" ON "public"."Case"("clientName" ASC);

-- CreateIndex
CREATE INDEX "Case_createdById_idx" ON "public"."Case"("createdById" ASC);

-- CreateIndex
CREATE INDEX "Case_status_idx" ON "public"."Case"("status" ASC);

-- CreateIndex
CREATE INDEX "Case_tenantId_idx" ON "public"."Case"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "ClaimFamily_tenantId_idx" ON "public"."ClaimFamily"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Claimant_claimantNumber_idx" ON "public"."Claimant"("claimantNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Claimant_claimantNumber_key" ON "public"."Claimant"("claimantNumber" ASC);

-- CreateIndex
CREATE INDEX "Claimant_emailHash_idx" ON "public"."Claimant"("emailHash" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Claimant_nameHash_birthdate_key" ON "public"."Claimant"("nameHash" ASC, "birthdate" ASC);

-- CreateIndex
CREATE INDEX "Claimant_phoneHash_idx" ON "public"."Claimant"("phoneHash" ASC);

-- CreateIndex
CREATE INDEX "Claimant_tenantId_idx" ON "public"."Claimant"("tenantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Client_name_key" ON "public"."Client"("name" ASC);

-- CreateIndex
CREATE INDEX "Client_tenantId_idx" ON "public"."Client"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Contact_caseId_idx" ON "public"."Contact"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Contact_tenantId_idx" ON "public"."Contact"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Contact_type_idx" ON "public"."Contact"("type" ASC);

-- CreateIndex
CREATE INDEX "Document_caseId_idx" ON "public"."Document"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Document_category_idx" ON "public"."Document"("category" ASC);

-- CreateIndex
CREATE INDEX "Document_documentControlNumber_idx" ON "public"."Document"("documentControlNumber" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Document_documentControlNumber_key" ON "public"."Document"("documentControlNumber" ASC);

-- CreateIndex
CREATE INDEX "Document_tenantId_idx" ON "public"."Document"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Document_uploadedById_idx" ON "public"."Document"("uploadedById" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_tenantId_idx" ON "public"."ErrorLog"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_timestamp_idx" ON "public"."ErrorLog"("timestamp" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_transactionId_idx" ON "public"."ErrorLog"("transactionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "ErrorLog_transactionId_key" ON "public"."ErrorLog"("transactionId" ASC);

-- CreateIndex
CREATE INDEX "ErrorLog_userId_idx" ON "public"."ErrorLog"("userId" ASC);

-- CreateIndex
CREATE INDEX "IdentityVerification_caseId_idx" ON "public"."IdentityVerification"("caseId" ASC);

-- CreateIndex
CREATE INDEX "IdentityVerification_tenantId_idx" ON "public"."IdentityVerification"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "IdentityVerification_verifiedById_idx" ON "public"."IdentityVerification"("verifiedById" ASC);

-- CreateIndex
CREATE INDEX "InboundRule_enabled_idx" ON "public"."InboundRule"("enabled" ASC);

-- CreateIndex
CREATE INDEX "InboundRule_tenantId_idx" ON "public"."InboundRule"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "InboundRule_userId_idx" ON "public"."InboundRule"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryItem_assetTag_key" ON "public"."InventoryItem"("assetTag" ASC);

-- CreateIndex
CREATE INDEX "InventoryItem_assignedToCaseId_idx" ON "public"."InventoryItem"("assignedToCaseId" ASC);

-- CreateIndex
CREATE INDEX "InventoryItem_assignedToUserId_idx" ON "public"."InventoryItem"("assignedToUserId" ASC);

-- CreateIndex
CREATE INDEX "InventoryItem_category_idx" ON "public"."InventoryItem"("category" ASC);

-- CreateIndex
CREATE INDEX "InventoryItem_status_idx" ON "public"."InventoryItem"("status" ASC);

-- CreateIndex
CREATE INDEX "InventoryItem_tenantId_idx" ON "public"."InventoryItem"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Meeting_caseId_idx" ON "public"."Meeting"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Meeting_organizerId_idx" ON "public"."Meeting"("organizerId" ASC);

-- CreateIndex
CREATE INDEX "Meeting_startTime_idx" ON "public"."Meeting"("startTime" ASC);

-- CreateIndex
CREATE INDEX "Meeting_tenantId_idx" ON "public"."Meeting"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "MeetingAttendee_meetingId_idx" ON "public"."MeetingAttendee"("meetingId" ASC);

-- CreateIndex
CREATE INDEX "MeetingAttendee_tenantId_idx" ON "public"."MeetingAttendee"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "MeetingAttendee_userId_idx" ON "public"."MeetingAttendee"("userId" ASC);

-- CreateIndex
CREATE INDEX "Message_archived_idx" ON "public"."Message"("archived" ASC);

-- CreateIndex
CREATE INDEX "Message_caseId_idx" ON "public"."Message"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Message_direction_idx" ON "public"."Message"("direction" ASC);

-- CreateIndex
CREATE INDEX "Message_isExternal_idx" ON "public"."Message"("isExternal" ASC);

-- CreateIndex
CREATE INDEX "Message_read_idx" ON "public"."Message"("read" ASC);

-- CreateIndex
CREATE INDEX "Message_recipientId_idx" ON "public"."Message"("recipientId" ASC);

-- CreateIndex
CREATE INDEX "Message_senderId_idx" ON "public"."Message"("senderId" ASC);

-- CreateIndex
CREATE INDEX "Message_starred_idx" ON "public"."Message"("starred" ASC);

-- CreateIndex
CREATE INDEX "Message_tenantId_idx" ON "public"."Message"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "MessageFolder_tenantId_idx" ON "public"."MessageFolder"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "MessageFolder_userId_idx" ON "public"."MessageFolder"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MessageFolder_userId_name_key" ON "public"."MessageFolder"("userId" ASC, "name" ASC);

-- CreateIndex
CREATE INDEX "MessageFolderAssignment_folderId_idx" ON "public"."MessageFolderAssignment"("folderId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "MessageFolderAssignment_messageId_folderId_key" ON "public"."MessageFolderAssignment"("messageId" ASC, "folderId" ASC);

-- CreateIndex
CREATE INDEX "MessageFolderAssignment_messageId_idx" ON "public"."MessageFolderAssignment"("messageId" ASC);

-- CreateIndex
CREATE INDEX "Note_authorId_idx" ON "public"."Note"("authorId" ASC);

-- CreateIndex
CREATE INDEX "Note_caseId_idx" ON "public"."Note"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Note_createdAt_idx" ON "public"."Note"("createdAt" ASC);

-- CreateIndex
CREATE INDEX "Note_noteType_idx" ON "public"."Note"("noteType" ASC);

-- CreateIndex
CREATE INDEX "Note_tenantId_idx" ON "public"."Note"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Reminder_sent_idx" ON "public"."Reminder"("sent" ASC);

-- CreateIndex
CREATE INDEX "Reminder_tenantId_idx" ON "public"."Reminder"("tenantId" ASC);

-- CreateIndex
CREATE INDEX "Reminder_triggerAt_idx" ON "public"."Reminder"("triggerAt" ASC);

-- CreateIndex
CREATE INDEX "Reminder_userId_idx" ON "public"."Reminder"("userId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SubscriptionPlan_code_key" ON "public"."SubscriptionPlan"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_emailHash_key" ON "public"."SuperAdmin"("emailHash" ASC);

-- CreateIndex
CREATE INDEX "SuperAdmin_email_idx" ON "public"."SuperAdmin"("email" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "SuperAdmin_email_key" ON "public"."SuperAdmin"("email" ASC);

-- CreateIndex
CREATE INDEX "Task_assignedToId_idx" ON "public"."Task"("assignedToId" ASC);

-- CreateIndex
CREATE INDEX "Task_caseId_idx" ON "public"."Task"("caseId" ASC);

-- CreateIndex
CREATE INDEX "Task_category_idx" ON "public"."Task"("category" ASC);

-- CreateIndex
CREATE INDEX "Task_dueDate_idx" ON "public"."Task"("dueDate" ASC);

-- CreateIndex
CREATE INDEX "Task_status_idx" ON "public"."Task"("status" ASC);

-- CreateIndex
CREATE INDEX "Task_tenantId_idx" ON "public"."Task"("tenantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_domain_key" ON "public"."Tenant"("domain" ASC);

-- CreateIndex
CREATE INDEX "Tenant_planId_idx" ON "public"."Tenant"("planId" ASC);

-- CreateIndex
CREATE INDEX "Tenant_slug_idx" ON "public"."Tenant"("slug" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug" ASC);

-- CreateIndex
CREATE INDEX "Tenant_status_idx" ON "public"."Tenant"("status" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_emailHash_key" ON "public"."User"("emailHash" ASC);

-- CreateIndex
CREATE INDEX "User_email_idx" ON "public"."User"("email" ASC);

-- CreateIndex
CREATE INDEX "User_role_idx" ON "public"."User"("role" ASC);

-- CreateIndex
CREATE INDEX "User_tenantId_idx" ON "public"."User"("tenantId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "public"."User"("username" ASC);

-- AddForeignKey
ALTER TABLE "public"."Accommodation" ADD CONSTRAINT "Accommodation_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Accommodation" ADD CONSTRAINT "Accommodation_decisionMakerId_fkey" FOREIGN KEY ("decisionMakerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Accommodation" ADD CONSTRAINT "Accommodation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Annotation" ADD CONSTRAINT "Annotation_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Annotation" ADD CONSTRAINT "Annotation_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."Document"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Annotation" ADD CONSTRAINT "Annotation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BugReport" ADD CONSTRAINT "BugReport_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."BugReport" ADD CONSTRAINT "BugReport_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallRequest" ADD CONSTRAINT "CallRequest_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CallRequest" ADD CONSTRAINT "CallRequest_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_claimFamilyId_fkey" FOREIGN KEY ("claimFamilyId") REFERENCES "public"."ClaimFamily"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_claimantRef_fkey" FOREIGN KEY ("claimantRef") REFERENCES "public"."Claimant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "public"."Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Case" ADD CONSTRAINT "Case_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ClaimFamily" ADD CONSTRAINT "ClaimFamily_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Claimant" ADD CONSTRAINT "Claimant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Client" ADD CONSTRAINT "Client_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Contact" ADD CONSTRAINT "Contact_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Document" ADD CONSTRAINT "Document_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ErrorLog" ADD CONSTRAINT "ErrorLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ErrorLog" ADD CONSTRAINT "ErrorLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IdentityVerification" ADD CONSTRAINT "IdentityVerification_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."IdentityVerification" ADD CONSTRAINT "IdentityVerification_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundRule" ADD CONSTRAINT "InboundRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundRule" ADD CONSTRAINT "InboundRule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundRuleFolder" ADD CONSTRAINT "InboundRuleFolder_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."MessageFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InboundRuleFolder" ADD CONSTRAINT "InboundRuleFolder_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "public"."InboundRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_assignedToCaseId_fkey" FOREIGN KEY ("assignedToCaseId") REFERENCES "public"."Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_assignedToUserId_fkey" FOREIGN KEY ("assignedToUserId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."InventoryItem" ADD CONSTRAINT "InventoryItem_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Meeting"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Meeting" ADD CONSTRAINT "Meeting_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MeetingAttendee" ADD CONSTRAINT "MeetingAttendee_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_forwardedFromId_fkey" FOREIGN KEY ("forwardedFromId") REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_replyToId_fkey" FOREIGN KEY ("replyToId") REFERENCES "public"."Message"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Message" ADD CONSTRAINT "Message_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageFolder" ADD CONSTRAINT "MessageFolder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageFolder" ADD CONSTRAINT "MessageFolder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageFolderAssignment" ADD CONSTRAINT "MessageFolderAssignment_folderId_fkey" FOREIGN KEY ("folderId") REFERENCES "public"."MessageFolder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."MessageFolderAssignment" ADD CONSTRAINT "MessageFolderAssignment_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "public"."Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."Note"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Note" ADD CONSTRAINT "Note_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_callId_fkey" FOREIGN KEY ("callId") REFERENCES "public"."CallRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_meetingId_fkey" FOREIGN KEY ("meetingId") REFERENCES "public"."Meeting"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "public"."Task"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Reminder" ADD CONSTRAINT "Reminder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_assignedToId_fkey" FOREIGN KEY ("assignedToId") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_caseId_fkey" FOREIGN KEY ("caseId") REFERENCES "public"."Case"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Task" ADD CONSTRAINT "Task_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Tenant" ADD CONSTRAINT "Tenant_planId_fkey" FOREIGN KEY ("planId") REFERENCES "public"."SubscriptionPlan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
