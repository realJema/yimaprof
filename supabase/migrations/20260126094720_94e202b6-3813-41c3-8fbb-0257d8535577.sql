-- Fix exam references to canonical subjects before deleting duplicates

-- Map BIOLOGY (7604cec6-445b-498b-a92e-c68f1b93611f) to biology (27decec9-26ae-47d5-9aa8-6b1003f33f69)
UPDATE exams SET subject_id = '27decec9-26ae-47d5-9aa8-6b1003f33f69'
WHERE subject_id = '7604cec6-445b-498b-a92e-c68f1b93611f';

-- Map ECONOMICS (4bb53ab4-4925-4c75-90d2-f13df36b6f78) to economics (0c20ee00-7259-44c1-aa6e-4ead95e1fe83)
UPDATE exams SET subject_id = '0c20ee00-7259-44c1-aa6e-4ead95e1fe83'
WHERE subject_id = '4bb53ab4-4925-4c75-90d2-f13df36b6f78';

-- Map GEOGRAPHY 1 (4605f68f-e309-412a-bfc3-932ce01c8857) to geography (d5f8d299-791c-4a5c-9730-37c4cd067f76)
UPDATE exams SET subject_id = 'd5f8d299-791c-4a5c-9730-37c4cd067f76'
WHERE subject_id = '4605f68f-e309-412a-bfc3-932ce01c8857';

-- Map GEOGRAPHY 2 (6edd7449-1176-4000-841c-7ff72d921b85) to geography (d5f8d299-791c-4a5c-9730-37c4cd067f76)
UPDATE exams SET subject_id = 'd5f8d299-791c-4a5c-9730-37c4cd067f76'
WHERE subject_id = '6edd7449-1176-4000-841c-7ff72d921b85';

-- Map FRENCH (067a8e8a-b2bd-45d6-a410-bd1f02f4c78c) to french (28208f88-d8a0-4492-adf5-69e4bc7c73fb)
UPDATE exams SET subject_id = '28208f88-d8a0-4492-adf5-69e4bc7c73fb'
WHERE subject_id = '067a8e8a-b2bd-45d6-a410-bd1f02f4c78c';

-- Map CITIZENSHIP (c1b78c69-a48a-4a90-93f7-46808be0a382) to citizenship (8feb730d-e2ef-4b9f-9ec8-427ee88cab35)
UPDATE exams SET subject_id = '8feb730d-e2ef-4b9f-9ec8-427ee88cab35'
WHERE subject_id = 'c1b78c69-a48a-4a90-93f7-46808be0a382';

-- Map EXPRESSION_ECRITE (9fed4206-a019-4a4d-b0c6-9313c3fab8ef) to EXPRESSION ECRITE (882a21c9-75a9-45b6-ac20-71fd8c7be730)
UPDATE exams SET subject_id = '882a21c9-75a9-45b6-ac20-71fd8c7be730'
WHERE subject_id = '9fed4206-a019-4a4d-b0c6-9313c3fab8ef';

-- Now delete duplicate subjects
DELETE FROM subjects WHERE id IN (
  '7604cec6-445b-498b-a92e-c68f1b93611f', -- BIOLOGY
  '4bb53ab4-4925-4c75-90d2-f13df36b6f78', -- ECONOMICS
  '4605f68f-e309-412a-bfc3-932ce01c8857', -- GEOGRAPHY 1
  '6edd7449-1176-4000-841c-7ff72d921b85', -- GEOGRAPHY 2
  '067a8e8a-b2bd-45d6-a410-bd1f02f4c78c', -- FRENCH
  'c1b78c69-a48a-4a90-93f7-46808be0a382', -- CITIZENSHIP
  '9fed4206-a019-4a4d-b0c6-9313c3fab8ef'  -- EXPRESSION_ECRITE
);