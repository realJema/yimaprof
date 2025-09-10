-- Add sample exam data with markdown content
INSERT INTO public.exams (
  title, 
  description, 
  subject, 
  class_level, 
  year, 
  period, 
  exam_type, 
  language, 
  is_published, 
  created_by,
  content
) VALUES 
-- Francophone Section Exams
('Mathématiques - Séquence 1', 'Examen de mathématiques portant sur les fonctions et les équations', 'Mathématiques', 'class_tle', 2024, '1ère Séquence', 'Devoir Surveillé', 'fr', true, (SELECT id FROM auth.users LIMIT 1), 
'# Devoir Surveillé de Mathématiques
## Terminale C - 1ère Séquence 2024

**Durée**: 3 heures  
**Coefficient**: 4

### Exercice 1: Fonctions (8 points)
Soit f(x) = 2x² - 3x + 1

1. Calculer f''(x)
2. Étudier les variations de f
3. Tracer la courbe représentative

### Exercice 2: Équations (7 points)
Résoudre dans ℝ:
1. 2x² - 5x + 3 = 0
2. |x - 2| = 3

### Exercice 3: Géométrie (5 points)
Dans le plan muni d''un repère orthonormé...'),

('Physique-Chimie - Contrôle', 'Évaluation sur la mécanique et les réactions chimiques', 'Physique-Chimie', 'class_1ere', 2024, '2ème Séquence', 'Composition', 'fr', true, (SELECT id FROM auth.users LIMIT 1),
'# Composition de Physique-Chimie
## Première D - 2ème Séquence 2024

**Durée**: 4 heures  
**Coefficient**: 3

### PHYSIQUE (12 points)

#### Partie A: Mécanique (8 points)
Un mobile ponctuel M se déplace sur un axe Ox...

1. Définir la vitesse instantanée
2. Calculer l''accélération

#### Partie B: Électricité (4 points)
Circuit RC série alimenté par une tension...

### CHIMIE (8 points)

#### Exercice 1: Réactions acide-base (4 points)
On considère la réaction: HCl + NaOH → NaCl + H₂O

#### Exercice 2: Cinétique chimique (4 points)
Étude de la vitesse de réaction...'),

-- Anglophone Section Exams  
('Mathematics - Term Test', 'Comprehensive test on calculus and algebra', 'Mathematics', 'upper_sixth', 2024, 'First Term', 'Test', 'en', true, (SELECT id FROM auth.users LIMIT 1),
'# Mathematics Term Test
## Upper Sixth - First Term 2024

**Duration**: 3 hours  
**Marks**: 100

### Question 1: Calculus (25 marks)
Given that f(x) = x³ - 3x² + 2x + 1

a) Find f''(x)
b) Determine the turning points
c) Sketch the graph of f(x)

### Question 2: Algebra (25 marks)
Solve the following equations:
a) 2x² - 7x + 3 = 0
b) log₂(x + 1) = 3

### Question 3: Geometry (25 marks)
In triangle ABC, AB = 5cm, BC = 7cm, AC = 8cm
Calculate the area using Heron''s formula

### Question 4: Statistics (25 marks)
A sample of 50 students took an exam...'),

('Physics - Mock Exam', 'Practice examination covering mechanics and waves', 'Physics', 'form_5', 2024, 'Second Term', 'Mock Exam', 'en', true, (SELECT id FROM auth.users LIMIT 1),
'# Physics Mock Examination  
## Form 5 - Second Term 2024

**Duration**: 2.5 hours  
**Total Marks**: 80

### Section A: Multiple Choice (20 marks)
Choose the best answer for each question.

1. The SI unit of force is:
   a) Newton  b) Joule  c) Watt  d) Pascal

2. Which of the following is a scalar quantity?
   a) Velocity  b) Displacement  c) Speed  d) Acceleration

### Section B: Structured Questions (60 marks)

#### Question 1: Motion (20 marks)
A car accelerates uniformly from rest to 30 m/s in 10 seconds.

a) Calculate the acceleration (3 marks)
b) Find the distance traveled (4 marks)
c) Draw a velocity-time graph (3 marks)

#### Question 2: Waves (20 marks)
A wave has frequency 50 Hz and wavelength 2m.

a) Calculate the wave speed (5 marks)
b) Define amplitude (3 marks)

#### Question 3: Energy (20 marks)
A 2kg mass is lifted to height 5m...')

ON CONFLICT DO NOTHING;

-- Add corrections for some exams
INSERT INTO public.corrections (
  exam_id,
  title,
  content,
  version,
  is_published,
  published_by
) VALUES
((SELECT id FROM public.exams WHERE title = 'Mathématiques - Séquence 1' LIMIT 1),
 'Correction Mathématiques Terminale C',
 '# Correction Détaillée - Mathématiques Terminale C

## Exercice 1: Fonctions

### 1. Calcul de f''(x)
f(x) = 2x² - 3x + 1
f''(x) = 4x - 3

**Justification**: La dérivée de ax^n est n·ax^(n-1)

### 2. Variations de f
f''(x) = 4x - 3 = 0 ⟹ x = 3/4

- Pour x < 3/4: f''(x) < 0 donc f décroissante
- Pour x > 3/4: f''(x) > 0 donc f croissante

**Minimum en x = 3/4**

### 3. Tracé de la courbe
- Sommet: (3/4, f(3/4)) = (3/4, -1/8)
- Intersections avec Ox: résoudre 2x² - 3x + 1 = 0
- Δ = 9 - 8 = 1 > 0, donc deux solutions
- x₁ = 1/2, x₂ = 1

## Exercice 2: Équations

### 1. 2x² - 5x + 3 = 0
Δ = 25 - 24 = 1
x₁ = (5+1)/4 = 3/2
x₂ = (5-1)/4 = 1

### 2. |x - 2| = 3
Cas 1: x - 2 = 3 ⟹ x = 5
Cas 2: x - 2 = -3 ⟹ x = -1

**Solutions**: x ∈ {-1, 5}',
 1,
 true,
 (SELECT id FROM auth.users LIMIT 1)),

((SELECT id FROM public.exams WHERE title = 'Mathematics - Term Test' LIMIT 1),
 'Mathematics Term Test - Solution Guide',
 '# Solution Guide - Mathematics Term Test

## Question 1: Calculus Solutions

### Part a) Finding f''(x)
Given: f(x) = x³ - 3x² + 2x + 1
f''(x) = 3x² - 6x + 2

**Working**:
- d/dx(x³) = 3x²
- d/dx(-3x²) = -6x  
- d/dx(2x) = 2
- d/dx(1) = 0

### Part b) Turning Points
f''(x) = 0
3x² - 6x + 2 = 0

Using quadratic formula:
x = (6 ± √(36-24))/6 = (6 ± √12)/6 = (6 ± 2√3)/6

**Turning points**: x = (3 ± √3)/3

### Part c) Sketching
- Find y-coordinates by substituting x-values
- Determine nature using second derivative test
- f''''(x) = 6x - 6

## Question 2: Algebra Solutions

### Part a) 2x² - 7x + 3 = 0
Using factorization: (2x - 1)(x - 3) = 0
**Solutions**: x = 1/2 or x = 3

### Part b) log₂(x + 1) = 3
Converting to exponential form:
x + 1 = 2³ = 8
**Solution**: x = 7

## Question 3: Geometry Solution
Using Heron''s formula:
s = (5 + 7 + 8)/2 = 10
Area = √[s(s-a)(s-b)(s-c)]
Area = √[10 × 5 × 3 × 2] = √300 = 10√3 cm²',
 1,
 true,
 (SELECT id FROM auth.users LIMIT 1))

ON CONFLICT DO NOTHING;