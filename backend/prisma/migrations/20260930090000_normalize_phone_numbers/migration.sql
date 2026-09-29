-- Store Indian phone numbers as their 10 digits (the app now normalises "+91 98260 12345",
-- "919826012345" and "09826012345" to "9826012345"). Accounts are only changed when the
-- 10-digit form isn't already used by another account, so no two logins collide.
UPDATE "users" u
SET "phone_number" = RIGHT(u."phone_number", 10)
WHERE u."phone_number" ~ '^(\+91|91)[6-9][0-9]{9}$'
  AND NOT EXISTS (SELECT 1 FROM "users" o WHERE o."phone_number" = RIGHT(u."phone_number", 10));

UPDATE "bite_reports" SET "contact_number" = RIGHT("contact_number", 10)
WHERE "contact_number" ~ '^(\+91|91)[6-9][0-9]{9}$';

UPDATE "cases" SET "contact_number" = RIGHT("contact_number", 10)
WHERE "contact_number" ~ '^(\+91|91)[6-9][0-9]{9}$';
