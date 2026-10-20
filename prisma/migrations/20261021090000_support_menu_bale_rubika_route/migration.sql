-- New options of the floating support menu (بله، روبیکا، مسیریابی تا فروشگاه) start switched on for a shop that has
-- already saved its menu; each one still appears only once its ID or map link is entered in the admin panel.
UPDATE "Setting"
SET "value" = "value" || ',bale,rubika,route'
WHERE "key" = 'support_channels' AND "value" <> '' AND "value" NOT LIKE '%bale%';
