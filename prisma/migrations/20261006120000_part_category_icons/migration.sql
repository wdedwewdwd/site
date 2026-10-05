-- Switch categories from the generic icons to the new auto-part icons.
-- A category actually about batteries keeps the battery icon.
UPDATE "Category" SET "icon" = 'spark-plug' WHERE "icon" = 'battery' AND "name" NOT LIKE '%باتری%';
UPDATE "Category" SET "icon" = 'shock-absorber' WHERE "icon" = 'circle-dot';
UPDATE "Category" SET "icon" = 'engine' WHERE "icon" = 'cog';
UPDATE "Category" SET "icon" = 'gearbox' WHERE "icon" = 'settings';
UPDATE "Category" SET "icon" = 'brake-disc' WHERE "icon" = 'disc';
