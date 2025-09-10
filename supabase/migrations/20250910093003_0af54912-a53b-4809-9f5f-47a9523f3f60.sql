-- Insert a sample correction for the Math exam with proper text content
INSERT INTO corrections (
  exam_id,
  title,
  content,
  published_by,
  is_published
) VALUES (
  '3784fd2a-3477-4936-bba4-9afce4ca079e',
  'Mathematics Term Test - Complete Solution',
  '"# Questions\n\n## Question 1: Calculus (25 marks)\nGiven that f(x) = x³ - 3x² + 2x + 1\n\na) Find f''(x)\nb) Determine the turning points\nc) Sketch the graph of f(x)\n\n## Question 2: Algebra (25 marks)\nSolve the following equations:\na) 2x² - 7x + 3 = 0\nb) log₂(x + 1) = 3\n\n## Question 3: Geometry (25 marks)\nIn triangle ABC, AB = 5cm, BC = 7cm, AC = 8cm\nCalculate the area using Heron''s formula\n\n## Question 4: Statistics (25 marks)\nA sample of 50 students took an exam with mean score 65 and standard deviation 12.\nCalculate the probability that a randomly selected student scored above 80.\n\n---\n\n# Complete Solutions\n\n## Solution 1: Calculus (25 marks)\n\n**a) Find f''(x)**\nf(x) = x³ - 3x² + 2x + 1\nf''(x) = 3x² - 6x + 2\nf''''(x) = 6x - 6\n\n**b) Determine the turning points**\nFor turning points, f''(x) = 0\n3x² - 6x + 2 = 0\nUsing quadratic formula: x = (6 ± √(36-24))/6 = (6 ± √12)/6 = (6 ± 2√3)/6 = 1 ± √3/3\n\nTurning points: x₁ = 1 - √3/3 ≈ 0.42, x₂ = 1 + √3/3 ≈ 1.58\n\n**c) Sketch the graph**\n- f''''(x) = 6x - 6 = 0 when x = 1 (inflection point)\n- f(0) = 1, f(1) = 1\n- The function has a local maximum at x₁ and local minimum at x₂\n\n## Solution 2: Algebra (25 marks)\n\n**a) 2x² - 7x + 3 = 0**\nUsing quadratic formula: x = (7 ± √(49-24))/4 = (7 ± √25)/4 = (7 ± 5)/4\nx₁ = 3, x₂ = 1/2\n\n**b) log₂(x + 1) = 3**\nx + 1 = 2³ = 8\nx = 7\n\n## Solution 3: Geometry (25 marks)\n\nUsing Heron''s formula:\ns = (a + b + c)/2 = (5 + 7 + 8)/2 = 10\nArea = √(s(s-a)(s-b)(s-c))\nArea = √(10 × 5 × 3 × 2) = √300 = 10√3 ≈ 17.32 cm²\n\n## Solution 4: Statistics (25 marks)\n\nGiven: μ = 65, σ = 12\nP(X > 80) = P(Z > (80-65)/12) = P(Z > 1.25)\nUsing standard normal table: P(Z > 1.25) ≈ 0.1056 or 10.56%"',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  true
) ON CONFLICT DO NOTHING;