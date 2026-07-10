-- CreateIndex
CREATE INDEX "Donor_deletedAt_idx" ON "Donor"("deletedAt");

-- CreateIndex
CREATE INDEX "Recipient_deletedAt_idx" ON "Recipient"("deletedAt");

-- CreateIndex
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

-- CreateIndex
CREATE INDEX "Donation_designatedRecipientId_idx" ON "Donation"("designatedRecipientId");

-- CreateIndex
CREATE INDEX "Donation_recordedById_idx" ON "Donation"("recordedById");

-- CreateIndex
CREATE INDEX "Donation_date_idx" ON "Donation"("date");

-- CreateIndex
CREATE INDEX "Donation_deletedAt_idx" ON "Donation"("deletedAt");

-- CreateIndex
CREATE INDEX "Distribution_recipientId_idx" ON "Distribution"("recipientId");

-- CreateIndex
CREATE INDEX "Distribution_donationId_idx" ON "Distribution"("donationId");

-- CreateIndex
CREATE INDEX "Distribution_recordedById_idx" ON "Distribution"("recordedById");

-- CreateIndex
CREATE INDEX "Distribution_date_idx" ON "Distribution"("date");

-- CreateIndex
CREATE INDEX "Distribution_deletedAt_idx" ON "Distribution"("deletedAt");

-- CreateIndex
CREATE INDEX "UserScope_userId_idx" ON "UserScope"("userId");

-- CreateIndex
CREATE INDEX "UserScope_donorId_idx" ON "UserScope"("donorId");

-- CreateIndex
CREATE INDEX "UserScope_recipientId_idx" ON "UserScope"("recipientId");
