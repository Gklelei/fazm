-- CreateEnum
CREATE TYPE "GradeRating" AS ENUM ('BELOW_STANDARD', 'NEEDS_WORK', 'GOOD', 'VERY_GOOD', 'EXCELLENT');

-- CreateEnum
CREATE TYPE "ATHLETE_ACCOUNT_STATUS" AS ENUM ('ACTIVE', 'PENDING', 'DEACTIVATED', 'DEFAULT');

-- CreateEnum
CREATE TYPE "PAYMENT_TYPE" AS ENUM ('CASH', 'BANK_TRANSFER', 'MPESA_SEND_MONEY', 'MPESA_PAYBILL');

-- CreateEnum
CREATE TYPE "INVOICE_STATUS" AS ENUM ('PENDING', 'PARTIAL', 'PAID', 'CANCELED', 'OVERDUE');

-- CreateEnum
CREATE TYPE "INVOICE_TYPE" AS ENUM ('SUBSCRIPTION', 'MANUAL', 'LATE_FEE', 'ITEM_PURCHASE');

-- CreateEnum
CREATE TYPE "SUBSCRIPTION_STATUS" AS ENUM ('ACTIVE', 'PAUSED', 'CANCELED', 'EXPIRED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SUB_FREQUENCY" AS ENUM ('YEARLY', 'MONTHLY', 'DAILY', 'WEEKLY', 'ONCE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED_AMOUNT');

-- CreateEnum
CREATE TYPE "CouponInterval" AS ENUM ('ONCE', 'REPEATING');

-- CreateEnum
CREATE TYPE "EXPENSECATGORIES_STATUS" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "DayOfWeek" AS ENUM ('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY');

-- CreateEnum
CREATE TYPE "TRAINING_STATUS" AS ENUM ('COMPLETED', 'CANCELLED', 'SCHEDULED', 'IN_PROGRESS');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "ROLES" AS ENUM ('COACH', 'ADMIN', 'DOCTOR', 'FINANCE', 'SUPER_ADMIN');

-- CreateTable
CREATE TABLE "assessments" (
    "id" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "athleteId" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "comment" TEXT,

    CONSTRAINT "assessments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentTemplateSection" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "order" INTEGER NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssessmentTemplateSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentMetric" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "sectionId" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "AssessmentMetric_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AssessmentResponse" (
    "id" TEXT NOT NULL,
    "assessmentId" TEXT NOT NULL,
    "metricId" TEXT NOT NULL,
    "grade" "GradeRating" NOT NULL,

    CONSTRAINT "AssessmentResponse_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete" (
    "id" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "email" TEXT,
    "age" INTEGER,
    "phone_number" TEXT,
    "date_of_birth" TEXT NOT NULL,
    "profile_picture" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "middle_name" TEXT,
    "nextBillingDate" TIMESTAMP(3),
    "status" "ATHLETE_ACCOUNT_STATUS" NOT NULL DEFAULT 'PENDING',
    "batches_id" TEXT NOT NULL,
    "height" TEXT NOT NULL,
    "weight" TEXT NOT NULL,
    "foot" TEXT NOT NULL,
    "hand" TEXT NOT NULL,
    "positions" TEXT[],
    "bith_certificate" TEXT,
    "national_id_front" TEXT,
    "national_id_back" TEXT,
    "passport_cover" TEXT,
    "passport_bio_data" TEXT,
    "is_archived" BOOLEAN NOT NULL DEFAULT false,
    "ArchiveDate" TIMESTAMP(3),

    CONSTRAINT "athlete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_sequence" (
    "id" INTEGER NOT NULL DEFAULT 1,
    "current" INTEGER NOT NULL,

    CONSTRAINT "athlete_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_guardian" (
    "id" TEXT NOT NULL,
    "full_names" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,

    CONSTRAINT "athlete_guardian_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_medical_and_emrgency" (
    "id" TEXT NOT NULL,
    "blood_group" TEXT NOT NULL,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medicalConditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "athlete_id" TEXT NOT NULL,

    CONSTRAINT "athlete_medical_and_emrgency_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_address" (
    "id" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "town" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,
    "estate" TEXT NOT NULL,

    CONSTRAINT "athlete_address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_emergency_contact" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "athlete_id" TEXT NOT NULL,

    CONSTRAINT "athlete_emergency_contact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "details" TEXT,
    "userId" TEXT,
    "athleteId" TEXT,
    "invoiceId" TEXT,
    "trainingId" TEXT,
    "assessmentId" TEXT,
    "batchId" TEXT,
    "drillId" TEXT,
    "academyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subscription_plans" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "interval" "SUB_FREQUENCY" NOT NULL,
    "description" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "subscription_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "athlete_subscriptions" (
    "id" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "status" "SUBSCRIPTION_STATUS" NOT NULL DEFAULT 'ACTIVE',
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "cancelAtPeriodEnd" BOOLEAN NOT NULL DEFAULT false,
    "currentPeriodStart" TIMESTAMP(3) NOT NULL,
    "currentPeriodEnd" TIMESTAMP(3) NOT NULL,
    "trialStart" TIMESTAMP(3),
    "trialEnd" TIMESTAMP(3),
    "paymentMethodId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" TEXT,
    "couponId" TEXT,

    CONSTRAINT "athlete_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "subscriptionPlanId" TEXT,
    "athleteSubscriptionId" TEXT,
    "type" "INVOICE_TYPE" NOT NULL DEFAULT 'SUBSCRIPTION',
    "description" TEXT,
    "unitAmount" DECIMAL(10,2) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "amountDue" DECIMAL(10,2) NOT NULL,
    "discount" DECIMAL(10,2),
    "amountPaid" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "status" "INVOICE_STATUS" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3) NOT NULL,
    "isRecurring" BOOLEAN NOT NULL DEFAULT false,
    "billingCycle" TEXT,
    "periodStart" TIMESTAMP(3),
    "periodEnd" TIMESTAMP(3),
    "nextBillingDate" TIMESTAMP(3),
    "issuedBy" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "couponId" TEXT,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "finance" (
    "id" TEXT NOT NULL,
    "notes" TEXT,
    "athleteId" TEXT NOT NULL,
    "invoiceId" TEXT,
    "amount_paid" DOUBLE PRECISION NOT NULL,
    "collected_by" TEXT NOT NULL,
    "payment_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payment_type" "PAYMENT_TYPE" NOT NULL DEFAULT 'CASH',
    "receipt_number" TEXT NOT NULL,
    "athleteSubscriptionId" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "finance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "coupons" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "discount_type" "DiscountType" NOT NULL DEFAULT 'PERCENTAGE',
    "value" DECIMAL(10,2) NOT NULL,
    "interval" "CouponInterval" NOT NULL DEFAULT 'ONCE',
    "start_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiry_date" TIMESTAMP(3),
    "usage_limit" INTEGER,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "status" INTEGER NOT NULL DEFAULT 1,
    "voided" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "expense_number" TEXT NOT NULL,
    "Description" TEXT,
    "amount" DOUBLE PRECISION NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "status" TEXT,
    "category_id" TEXT NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" "EXPENSECATGORIES_STATUS" NOT NULL,
    "description" TEXT,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training" (
    "id" TEXT NOT NULL,
    "batchesId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "note" TEXT,
    "status" "TRAINING_STATUS" NOT NULL DEFAULT 'SCHEDULED',
    "duration" INTEGER NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,
    "trainingLocationsId" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "drillOrder" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "training_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3),
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batch_schedules" (
    "id" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "dayOfWeek" "DayOfWeek" NOT NULL,
    "time" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batch_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drills" (
    "id" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "voided" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "drills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "athleteId" TEXT NOT NULL,
    "coachId" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'ABSENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reasonId" TEXT,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_locations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "voided" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "training_locations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_attendance_reasons" (
    "id" TEXT NOT NULL,
    "status" "AttendanceStatus" NOT NULL,
    "label" TEXT,

    CONSTRAINT "training_attendance_reasons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "ROLES" NOT NULL DEFAULT 'ADMIN',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isArchived" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "academy" (
    "id" TEXT NOT NULL,
    "paymentMathod" TEXT NOT NULL,
    "paymentMethodType" TEXT NOT NULL,
    "academy_name" TEXT NOT NULL,
    "tagline" TEXT,
    "description" TEXT,
    "contact_email" TEXT,
    "contact_phone" TEXT,
    "address" TEXT,
    "logo_url" TEXT,
    "hero_image_url" TEXT,
    "receipt_notes" TEXT,
    "primary_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "academy_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "staff" (
    "id" TEXT NOT NULL,
    "staffId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fullNames" TEXT NOT NULL,
    "phone_number" TEXT NOT NULL,
    "createAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updateAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TrainingToAthletes" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrainingToAthletes_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_TrainingToDrills" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TrainingToDrills_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessments_athleteId_trainingId_key" ON "assessments"("athleteId", "trainingId");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentResponse_assessmentId_metricId_key" ON "AssessmentResponse"("assessmentId", "metricId");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_athlete_id_key" ON "athlete"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_email_key" ON "athlete"("email");

-- CreateIndex
CREATE INDEX "athlete_guardian_athlete_id_idx" ON "athlete_guardian"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_medical_and_emrgency_athlete_id_key" ON "athlete_medical_and_emrgency"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "athlete_address_athlete_id_key" ON "athlete_address"("athlete_id");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_plans_code_key" ON "subscription_plans"("code");

-- CreateIndex
CREATE INDEX "athlete_subscriptions_athleteId_status_idx" ON "athlete_subscriptions"("athleteId", "status");

-- CreateIndex
CREATE INDEX "athlete_subscriptions_currentPeriodEnd_idx" ON "athlete_subscriptions"("currentPeriodEnd");

-- CreateIndex
CREATE INDEX "athlete_subscriptions_endDate_idx" ON "athlete_subscriptions"("endDate");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoiceNumber_key" ON "invoices"("invoiceNumber");

-- CreateIndex
CREATE INDEX "invoices_athleteId_idx" ON "invoices"("athleteId");

-- CreateIndex
CREATE INDEX "invoices_subscriptionPlanId_idx" ON "invoices"("subscriptionPlanId");

-- CreateIndex
CREATE INDEX "invoices_athleteSubscriptionId_idx" ON "invoices"("athleteSubscriptionId");

-- CreateIndex
CREATE INDEX "invoices_status_idx" ON "invoices"("status");

-- CreateIndex
CREATE INDEX "invoices_dueDate_idx" ON "invoices"("dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "finance_receipt_number_key" ON "finance"("receipt_number");

-- CreateIndex
CREATE INDEX "finance_athleteId_idx" ON "finance"("athleteId");

-- CreateIndex
CREATE INDEX "finance_invoiceId_idx" ON "finance"("invoiceId");

-- CreateIndex
CREATE INDEX "finance_athleteSubscriptionId_idx" ON "finance"("athleteSubscriptionId");

-- CreateIndex
CREATE INDEX "finance_payment_date_idx" ON "finance"("payment_date");

-- CreateIndex
CREATE UNIQUE INDEX "coupons_name_key" ON "coupons"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "expenses"("expense_number");

-- CreateIndex
CREATE INDEX "batch_schedules_batchId_idx" ON "batch_schedules"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_trainingId_athleteId_key" ON "attendance"("trainingId", "athleteId");

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE INDEX "session_userId_idx" ON "session"("userId");

-- CreateIndex
CREATE INDEX "account_userId_idx" ON "account"("userId");

-- CreateIndex
CREATE INDEX "verification_identifier_idx" ON "verification"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "staff_staffId_key" ON "staff"("staffId");

-- CreateIndex
CREATE UNIQUE INDEX "staff_userId_key" ON "staff"("userId");

-- CreateIndex
CREATE INDEX "_TrainingToAthletes_B_index" ON "_TrainingToAthletes"("B");

-- CreateIndex
CREATE INDEX "_TrainingToDrills_B_index" ON "_TrainingToDrills"("B");

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("athlete_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessments" ADD CONSTRAINT "assessments_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "staff"("staffId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentMetric" ADD CONSTRAINT "AssessmentMetric_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "AssessmentTemplateSection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentResponse" ADD CONSTRAINT "AssessmentResponse_metricId_fkey" FOREIGN KEY ("metricId") REFERENCES "AssessmentMetric"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete" ADD CONSTRAINT "athlete_batches_id_fkey" FOREIGN KEY ("batches_id") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_guardian" ADD CONSTRAINT "athlete_guardian_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_medical_and_emrgency" ADD CONSTRAINT "athlete_medical_and_emrgency_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("athlete_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_address" ADD CONSTRAINT "athlete_address_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_emergency_contact" ADD CONSTRAINT "athlete_emergency_contact_athlete_id_fkey" FOREIGN KEY ("athlete_id") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "training"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_assessmentId_fkey" FOREIGN KEY ("assessmentId") REFERENCES "assessments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_drillId_fkey" FOREIGN KEY ("drillId") REFERENCES "drills"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_subscriptions" ADD CONSTRAINT "athlete_subscriptions_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("athlete_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_subscriptions" ADD CONSTRAINT "athlete_subscriptions_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "athlete_subscriptions" ADD CONSTRAINT "athlete_subscriptions_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("athlete_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_subscriptionPlanId_fkey" FOREIGN KEY ("subscriptionPlanId") REFERENCES "subscription_plans"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_athleteSubscriptionId_fkey" FOREIGN KEY ("athleteSubscriptionId") REFERENCES "athlete_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_couponId_fkey" FOREIGN KEY ("couponId") REFERENCES "coupons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance" ADD CONSTRAINT "finance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("athlete_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance" ADD CONSTRAINT "finance_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "finance" ADD CONSTRAINT "finance_athleteSubscriptionId_fkey" FOREIGN KEY ("athleteSubscriptionId") REFERENCES "athlete_subscriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_batchesId_fkey" FOREIGN KEY ("batchesId") REFERENCES "batches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_staffId_fkey" FOREIGN KEY ("staffId") REFERENCES "staff"("staffId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training" ADD CONSTRAINT "training_trainingLocationsId_fkey" FOREIGN KEY ("trainingLocationsId") REFERENCES "training_locations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batch_schedules" ADD CONSTRAINT "batch_schedules_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "training"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_athleteId_fkey" FOREIGN KEY ("athleteId") REFERENCES "athlete"("athlete_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_coachId_fkey" FOREIGN KEY ("coachId") REFERENCES "staff"("staffId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_reasonId_fkey" FOREIGN KEY ("reasonId") REFERENCES "training_attendance_reasons"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "staff" ADD CONSTRAINT "staff_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingToAthletes" ADD CONSTRAINT "_TrainingToAthletes_A_fkey" FOREIGN KEY ("A") REFERENCES "athlete"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingToAthletes" ADD CONSTRAINT "_TrainingToAthletes_B_fkey" FOREIGN KEY ("B") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingToDrills" ADD CONSTRAINT "_TrainingToDrills_A_fkey" FOREIGN KEY ("A") REFERENCES "drills"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TrainingToDrills" ADD CONSTRAINT "_TrainingToDrills_B_fkey" FOREIGN KEY ("B") REFERENCES "training"("id") ON DELETE CASCADE ON UPDATE CASCADE;
