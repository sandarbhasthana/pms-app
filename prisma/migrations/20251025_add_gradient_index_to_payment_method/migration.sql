-- Add gradientIndex field to PaymentMethod table
ALTER TABLE "PaymentMethod" ADD COLUMN "gradientIndex" INTEGER NOT NULL DEFAULT 0;

-- Assign gradient indices to existing cards based on their creation order
-- This ensures existing cards maintain visual consistency
WITH ranked_cards AS (
  SELECT 
    id,
    ROW_NUMBER() OVER (PARTITION BY "customerId" ORDER BY "createdAt" ASC) - 1 as new_gradient_index
  FROM "PaymentMethod"
)
UPDATE "PaymentMethod"
SET "gradientIndex" = ranked_cards.new_gradient_index
FROM ranked_cards
WHERE "PaymentMethod".id = ranked_cards.id;

