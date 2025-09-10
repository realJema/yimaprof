-- Insert a sample correction for the Math exam
INSERT INTO corrections (
  exam_id,
  title,
  content,
  published_by,
  is_published
) VALUES (
  '3784fd2a-3477-4936-bba4-9afce4ca079e',
  'Mathematics Term Test - Complete Solution',
  '# Questions

## Question 1: Calculus (25 marks)
Given that f(x) = x³ - 3x² + 2x + 1

a) Find f''(x)
b) Determine the turning points  
c) Sketch the graph of f(x)

## Question 2: Algebra (25 marks)
Solve the following equations:
a) 2x² - 7x + 3 = 0
b) log₂(x + 1) = 3

## Question 3: Geometry (25 marks)
In triangle ABC, AB = 5cm, BC = 7cm, AC = 8cm
Calculate the area using Heron''s formula

## Question 4: Statistics (25 marks)
A sample of 50 students took an exam with mean score 65 and standard deviation 12.
Calculate the probability that a randomly selected student scored above 80.

---

# Complete Solutions

## Solution 1: Calculus (25 marks)

**a) Find f''(x)**
f(x) = x³ - 3x² + 2x + 1
f''(x) = 3x² - 6x + 2
f''''(x) = 6x - 6

**b) Determine the turning points**
For turning points, f''(x) = 0
3x² - 6x + 2 = 0
Using quadratic formula: x = (6 ± √(36-24))/6 = (6 ± √12)/6 = (6 ± 2√3)/6 = 1 ± √3/3

Turning points: x₁ = 1 - √3/3 ≈ 0.42, x₂ = 1 + √3/3 ≈ 1.58

**c) Sketch the graph**
- f''''(x) = 6x - 6 = 0 when x = 1 (inflection point)
- f(0) = 1, f(1) = 1
- The function has a local maximum at x₁ and local minimum at x₂

## Solution 2: Algebra (25 marks)

**a) 2x² - 7x + 3 = 0**
Using quadratic formula: x = (7 ± √(49-24))/4 = (7 ± √25)/4 = (7 ± 5)/4
x₁ = 3, x₂ = 1/2

**b) log₂(x + 1) = 3**
x + 1 = 2³ = 8
x = 7

## Solution 3: Geometry (25 marks)

Using Heron''s formula:
s = (a + b + c)/2 = (5 + 7 + 8)/2 = 10
Area = √(s(s-a)(s-b)(s-c))
Area = √(10 × 5 × 3 × 2) = √300 = 10√3 ≈ 17.32 cm²

## Solution 4: Statistics (25 marks)

Given: μ = 65, σ = 12
P(X > 80) = P(Z > (80-65)/12) = P(Z > 1.25)
Using standard normal table: P(Z > 1.25) ≈ 0.1056 or 10.56%',
  (SELECT id FROM profiles WHERE role = 'admin' LIMIT 1),
  true
) ON CONFLICT DO NOTHING;