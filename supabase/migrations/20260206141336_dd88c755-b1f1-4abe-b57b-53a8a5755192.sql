-- Drop the atomic payment functions that are no longer needed
-- The webhook-based system handles payment completion directly

DROP FUNCTION IF EXISTS public.complete_payment_transaction(uuid, uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.fail_payment_transaction(uuid, text);