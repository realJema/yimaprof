-- Fix the payment_provider enum to include mesomb
ALTER TYPE payment_provider ADD VALUE IF NOT EXISTS 'mesomb';

-- Update the transaction status enum if needed
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'processing' AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'transaction_status')) THEN
        ALTER TYPE transaction_status ADD VALUE 'processing';
    END IF;
END $$;