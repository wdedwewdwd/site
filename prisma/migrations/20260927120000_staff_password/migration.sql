-- Staff password login (scrypt hash, see src/lib/password.ts)
ALTER TABLE "User" ADD COLUMN "passwordHash" TEXT;
