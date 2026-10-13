-- Cash on delivery was removed from checkout: the seeded FAQ answer about payment methods no longer offers it.
-- Only the untouched seeded text is replaced, so an answer the owner has rewritten is left alone.
UPDATE "Faq"
SET "answer" = 'پرداخت فقط به‌صورت آنلاین و از طریق درگاه امن بانکی (عضو شبکه شاپرک) انجام می‌شود.'
WHERE "answer" = 'پرداخت آنلاین از طریق درگاه امن بانکی (عضو شبکه شاپرک) و پرداخت در محل با کارتخوان.';
