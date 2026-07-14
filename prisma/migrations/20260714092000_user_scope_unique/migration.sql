-- Deduplicate any existing (userId, donorId) / (userId, recipientId) pairs
-- before adding the unique indexes, so `migrate deploy` cannot fail on
-- pre-existing data. Keeps the lowest ctid (arbitrary but deterministic
-- within the statement) of each duplicate group.
DELETE FROM "UserScope" a
USING "UserScope" b
WHERE a."userId" = b."userId"
  AND a."donorId" = b."donorId"
  AND a."donorId" IS NOT NULL
  AND a.ctid > b.ctid;

DELETE FROM "UserScope" a
USING "UserScope" b
WHERE a."userId" = b."userId"
  AND a."recipientId" = b."recipientId"
  AND a."recipientId" IS NOT NULL
  AND a.ctid > b.ctid;

-- CreateIndex (NULLs are distinct in Postgres unique indexes, so donor-only
-- rows never conflict with recipient-only rows and vice versa)
CREATE UNIQUE INDEX "UserScope_userId_donorId_key" ON "UserScope"("userId", "donorId");

-- CreateIndex
CREATE UNIQUE INDEX "UserScope_userId_recipientId_key" ON "UserScope"("userId", "recipientId");
