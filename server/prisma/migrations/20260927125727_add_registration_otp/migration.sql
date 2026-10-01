-- CreateTable
CREATE TABLE "RegistrationOtp" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "college" TEXT,
    "passwordHash" TEXT NOT NULL,
    "otpHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RegistrationOtp_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RegistrationOtp_email_key" ON "RegistrationOtp"("email");

-- CreateIndex
CREATE INDEX "RegistrationOtp_expiresAt_idx" ON "RegistrationOtp"("expiresAt");
