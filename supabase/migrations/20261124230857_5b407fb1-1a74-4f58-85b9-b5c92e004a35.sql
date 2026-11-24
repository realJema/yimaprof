UPDATE public.transactions
SET status = 'failed',
    updated_at = now(),
    metadata = metadata || jsonb_build_object(
      'failure_reason', 'payment_provider_unavailable',
      'provider_error', 'MeSomb API key inactive',
      'confirmed_by', 'provider-precollection-refusal',
      'failed_at', now()
    )
WHERE id IN (
  '855ff317-9a37-4989-959a-de1188feac15',
  '1bd0d506-b8d4-4873-b8ea-af1dd03b9740',
  '0ab57d31-b18c-4d41-af72-6bb16dbca757',
  'b0fd48fc-6065-4de8-b4fd-6c04a71da5a1',
  '45df7d26-f7b1-4df9-a297-ec2d047c97d9'
)
AND provider = 'mesomb'
AND status = 'processing'
AND provider_reference IS NULL
AND metadata ? 'sdk_call_started';