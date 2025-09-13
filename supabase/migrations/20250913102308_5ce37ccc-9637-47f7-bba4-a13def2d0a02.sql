-- Insert establishments if they don't exist
INSERT INTO public.establishments (name, type, country) VALUES
('Lycée Moderne de Cocody', 'lycee', 'CI'),
('Collège Sainte-Marie', 'college', 'CI'),
('Lycée Technique d''Abidjan', 'lycee_technique', 'CI'),
('Collège Notre-Dame', 'college', 'CI')
ON CONFLICT DO NOTHING;

-- Insert classes if they don't exist
INSERT INTO public.classes (name, display_name, level, section, description) VALUES
('6eme', '6ème', 'college', 'generale', 'Sixième - Collège'),
('5eme', '5ème', 'college', 'generale', 'Cinquième - Collège'),
('4eme', '4ème', 'college', 'generale', 'Quatrième - Collège'),
('3eme', '3ème', 'college', 'generale', 'Troisième - Collège'),
('2nde', '2nde', 'lycee', 'generale', 'Seconde - Lycée'),
('1ere_s', '1ère S', 'lycee', 'scientifique', 'Première Scientifique'),
('1ere_l', '1ère L', 'lycee', 'litteraire', 'Première Littéraire'),
('tle_s', 'Tle S', 'lycee', 'scientifique', 'Terminale Scientifique'),
('tle_l', 'Tle L', 'lycee', 'litteraire', 'Terminale Littéraire')
ON CONFLICT DO NOTHING;

-- Create a system user profile for creating exams
INSERT INTO public.profiles (id, email, first_name, last_name, role) VALUES
('00000000-0000-0000-0000-000000000001', 'system@example.com', 'Système', 'Admin', 'admin')
ON CONFLICT DO NOTHING;

-- Insert exam papers with realistic content
INSERT INTO public.exams (
    title, subject, description, year, period, exam_type, class_id, establishment_id,
    content, is_published, visibility, language, created_by, duration_minutes, tags
) VALUES

-- Mathématiques 3ème
(
    'Devoir de Mathématiques - Équations et Géométrie',
    'Mathématiques',
    'Évaluation sur les équations du premier degré et les propriétés géométriques',
    2024,
    'premier_trimestre',
    'devoir',
    (SELECT id FROM classes WHERE name = '3eme' LIMIT 1),
    (SELECT id FROM establishments WHERE name = 'Lycée Moderne de Cocody' LIMIT 1),
    '{
        "questions": [
            {
                "id": 1,
                "type": "exercise",
                "title": "Exercice 1 - Équations (8 points)",
                "content": "**Résoudre les équations suivantes :**\n\na) 3x + 5 = 2x - 7\n\nb) 2(x - 3) = 4x + 1\n\nc) (x + 2)/3 = (2x - 1)/5",
                "points": 8,
                "solution": "**Solutions :**\n\na) 3x + 5 = 2x - 7\n   3x - 2x = -7 - 5\n   x = -12\n\nb) 2(x - 3) = 4x + 1\n   2x - 6 = 4x + 1\n   2x - 4x = 1 + 6\n   -2x = 7\n   x = -7/2\n\nc) (x + 2)/3 = (2x - 1)/5\n   5(x + 2) = 3(2x - 1)\n   5x + 10 = 6x - 3\n   5x - 6x = -3 - 10\n   -x = -13\n   x = 13"
            },
            {
                "id": 2,
                "type": "exercise",
                "title": "Exercice 2 - Géométrie (7 points)",
                "content": "**ABC est un triangle rectangle en A. On donne AB = 6 cm et AC = 8 cm.**\n\na) Calculer BC.\n\nb) Calculer l''aire du triangle ABC.\n\nc) Calculer le périmètre du triangle ABC.",
                "points": 7,
                "solution": "**Solutions :**\n\na) D''après le théorème de Pythagore :\n   BC² = AB² + AC² = 6² + 8² = 36 + 64 = 100\n   BC = √100 = 10 cm\n\nb) Aire = (AB × AC)/2 = (6 × 8)/2 = 24 cm²\n\nc) Périmètre = AB + AC + BC = 6 + 8 + 10 = 24 cm"
            },
            {
                "id": 3,
                "type": "exercise",
                "title": "Exercice 3 - Problème (5 points)",
                "content": "**Un père a 42 ans et son fils a 12 ans. Dans combien d''années l''âge du père sera-t-il le double de l''âge du fils ?**",
                "points": 5,
                "solution": "**Solution :**\n\nSoit x le nombre d''années cherché.\n\nDans x années :\n- Le père aura : 42 + x ans\n- Le fils aura : 12 + x ans\n\nOn veut : 42 + x = 2(12 + x)\n42 + x = 24 + 2x\n42 - 24 = 2x - x\n18 = x\n\n**Réponse :** Dans 18 ans, l''âge du père sera le double de l''âge du fils.\n\n**Vérification :** Père : 42 + 18 = 60 ans, Fils : 12 + 18 = 30 ans. 60 = 2 × 30 ✓"
            }
        ]
    }',
    true,
    'public',
    'fr',
    '00000000-0000-0000-0000-000000000001',
    120,
    ARRAY['mathématiques', 'équations', 'géométrie', '3ème']
),

-- Français 1ère L
(
    'Composition de Français - Analyse littéraire',
    'Français',
    'Analyse d''un extrait de ''L''Étranger'' de Camus et dissertation sur l''absurde',
    2024,
    'deuxieme_trimestre',
    'composition',
    (SELECT id FROM classes WHERE name = '1ere_l' LIMIT 1),
    (SELECT id FROM establishments WHERE name = 'Collège Sainte-Marie' LIMIT 1),
    '{
        "questions": [
            {
                "id": 1,
                "type": "text_analysis",
                "title": "Première partie - Analyse de texte (12 points)",
                "content": "**Texte :** Extrait de *L''Étranger* d''Albert Camus\n\n*\"Aujourd''hui, maman est morte. Ou peut-être hier, je ne sais pas. J''ai reçu un télégramme de l''asile : \"Mère décédée. Enterrement demain. Sentiments distingués.\" Cela ne veut rien dire. C''était peut-être hier.\"*\n\n**Questions :**\n\n1. **Analysez le ton de ce passage. (4 points)**\n\n2. **Que révèle l''attitude du narrateur sur sa personnalité ? (4 points)**\n\n3. **Commentez l''usage du style télégraphique dans le télégramme. (4 points)**",
                "points": 12,
                "solution": "**Éléments de correction :**\n\n1. **Ton du passage :** Détachement émotionnel, froideur, neutralité troublante. Le narrateur évoque la mort de sa mère avec une indifférence apparente.\n\n2. **Personnalité du narrateur :** Meursault apparaît comme un personnage atypique, détaché des conventions sociales, incapable d''exprimer des émotions conventionnelles face à la mort.\n\n3. **Style télégraphique :** Contraste entre la sécheresse administrative et la gravité de l''événement. Illustration de l''absurdité de la condition humaine."
            },
            {
                "id": 2,
                "type": "essay",
                "title": "Deuxième partie - Dissertation (8 points)",
                "content": "**Sujet :** \"L''absurde naît de cette confrontation entre l''appel humain et le silence déraisonnable du monde\" (Camus)\n\n**Vous développerez cette citation en vous appuyant sur vos lectures et vos connaissances littéraires.**",
                "points": 8,
                "solution": "**Plan suggéré :**\n\n**I. L''appel humain : le besoin de sens et de cohérence**\n- Quête de signification\n- Besoin de logique et d''explication\n\n**II. Le silence du monde : l''absence de réponse**\n- Indifférence de l''univers\n- Absence de Dieu ou de sens préétabli\n\n**III. La naissance de l''absurde**\n- Confrontation génératrice d''angoisse\n- Prise de conscience de la condition humaine\n- Révolte et acceptation lucide"
            }
        ]
    }',
    true,
    'public',
    'fr',
    '00000000-0000-0000-0000-000000000001',
    180,
    ARRAY['français', 'littérature', 'camus', 'analyse', '1ère']
),

-- Sciences Physiques Terminale S
(
    'Contrôle de Physique-Chimie - Mécanique et Cinétique',
    'Sciences Physiques',
    'Évaluation sur les lois de Newton et la cinétique chimique',
    2024,
    'premier_trimestre',
    'controle',
    (SELECT id FROM classes WHERE name = 'tle_s' LIMIT 1),
    (SELECT id FROM establishments WHERE name = 'Lycée Technique d''Abidjan' LIMIT 1),
    '{
        "questions": [
            {
                "id": 1,
                "type": "exercise",
                "title": "Exercice 1 - Mécanique (10 points)",
                "content": "**Un bloc de masse m = 2 kg glisse sur un plan incliné d''angle α = 30° par rapport à l''horizontale.**\n\n**Données :** g = 10 m/s², coefficient de frottement μ = 0,2\n\na) **Faire le bilan des forces appliquées au bloc. (2 points)**\n\nb) **Calculer la composante du poids parallèle au plan incliné. (2 points)**\n\nc) **Calculer la force de frottement. (3 points)**\n\nd) **En déduire l''accélération du bloc. (3 points)**",
                "points": 10,
                "solution": "**Solution :**\n\na) **Forces appliquées :**\n- Poids : P⃗ = mg⃗\n- Réaction normale : N⃗\n- Force de frottement : f⃗\n\nb) **Composante parallèle :**\nP∥ = mg sin α = 2 × 10 × sin 30° = 20 × 0,5 = 10 N\n\nc) **Force de frottement :**\nN = mg cos α = 2 × 10 × cos 30° = 20 × (√3/2) = 10√3 N\nf = μN = 0,2 × 10√3 = 2√3 ≈ 3,46 N\n\nd) **Accélération :**\nF_résultante = P∥ - f = 10 - 2√3 ≈ 6,54 N\na = F_résultante/m = 6,54/2 ≈ 3,27 m/s²"
            },
            {
                "id": 2,
                "type": "exercise",
                "title": "Exercice 2 - Cinétique chimique (10 points)",
                "content": "**La réaction de décomposition de l''eau oxygénée suit la cinétique :**\n\n**2 H₂O₂ → 2 H₂O + O₂**\n\n**La concentration en H₂O₂ varie selon le tableau :**\n\n| Temps (min) | 0 | 10 | 20 | 30 | 40 |\n|-------------|---|----|----|----|\n| [H₂O₂] (mol/L) | 0,100 | 0,071 | 0,050 | 0,035 | 0,025 |\n\na) **Calculer la vitesse moyenne entre t = 0 et t = 10 min. (3 points)**\n\nb) **Déterminer l''ordre de la réaction en traçant ln[H₂O₂] = f(t). (4 points)**\n\nc) **Calculer la constante de vitesse k. (3 points)**",
                "points": 10,
                "solution": "**Solution :**\n\na) **Vitesse moyenne :**\nv = -Δ[H₂O₂]/Δt = -(0,071 - 0,100)/(10 - 0) = 0,029/10 = 2,9 × 10⁻³ mol/L/min\n\nb) **Ordre de la réaction :**\nln[H₂O₂] en fonction de t donne une droite → réaction d''ordre 1\n\nCalcul des ln[H₂O₂] :\n- t = 0 : ln(0,100) = -2,30\n- t = 10 : ln(0,071) = -2,64\n- t = 20 : ln(0,050) = -3,00\n- t = 30 : ln(0,035) = -3,35\n- t = 40 : ln(0,025) = -3,69\n\nc) **Constante de vitesse :**\nPente = -k = (-3,69 - (-2,30))/(40 - 0) = -1,39/40 = -0,0348\nk = 0,0348 min⁻¹"
            }
        ]
    }',
    true,
    'public',
    'fr',
    '00000000-0000-0000-0000-000000000001',
    180,
    ARRAY['physique', 'chimie', 'mécanique', 'cinétique', 'terminale']
),

-- Histoire-Géographie 2nde
(
    'Contrôle d''Histoire-Géographie - L''Europe et le Monde au XVIe siècle',
    'Histoire-Géographie',
    'Évaluation sur les grandes découvertes et la Renaissance européenne',
    2024,
    'deuxieme_trimestre',
    'controle',
    (SELECT id FROM classes WHERE name = '2nde' LIMIT 1),
    (SELECT id FROM establishments WHERE name = 'Collège Notre-Dame' LIMIT 1),
    '{
        "questions": [
            {
                "id": 1,
                "type": "knowledge",
                "title": "Première partie - Connaissances (8 points)",
                "content": "**Répondez aux questions suivantes :**\n\n1. **Citez trois explorateurs européens du XVIe siècle et leurs découvertes. (3 points)**\n\n2. **Quelles sont les conséquences des grandes découvertes pour l''Europe ? (3 points)**\n\n3. **Définissez la Renaissance et citez deux de ses caractéristiques. (2 points)**",
                "points": 8,
                "solution": "**Réponses attendues :**\n\n1. **Explorateurs :**\n- Christophe Colomb : découverte de l''Amérique (1492)\n- Vasco de Gama : route des Indes par le cap de Bonne-Espérance\n- Magellan : premier tour du monde\n\n2. **Conséquences :**\n- Enrichissement de l''Europe (or, argent d''Amérique)\n- Développement du commerce mondial\n- Expansion coloniale européenne\n- Révolution des connaissances géographiques\n\n3. **Renaissance :**\nMouvement culturel et artistique (XVe-XVIe siècles)\nCaractéristiques : retour à l''Antiquité, humanisme, développement des arts et sciences"
            },
            {
                "id": 2,
                "type": "document_analysis",
                "title": "Deuxième partie - Analyse de document (12 points)",
                "content": "**Document :** Lettre de Christophe Colomb aux Rois Catholiques (1493)\n\n*\"Les terres que j''ai découvertes sont très fertiles et très peuplées [...] Il y a de nombreuses épices et de grandes mines d''or et d''autres métaux [...] Je peux donner autant d''or que Leurs Altesses en auront besoin [...] et des esclaves autant qu''on en commandera.\"*\n\n**Questions :**\n\n1. **Présentez le document (auteur, date, nature, destinataire). (3 points)**\n\n2. **Quels sont les intérêts que Colomb met en avant ? (4 points)**\n\n3. **Que révèle ce document sur les motivations des grandes découvertes ? (5 points)**",
                "points": 12,
                "solution": "**Éléments de correction :**\n\n1. **Présentation :**\nAuteur : Christophe Colomb, navigateur au service de l''Espagne\nDate : 1493, après son premier voyage\nNature : Lettre officielle\nDestinataire : Rois Catholiques d''Espagne (Isabelle et Ferdinand)\n\n2. **Intérêts mis en avant :**\n- Richesses naturelles (or, métaux précieux)\n- Ressources agricoles (terres fertiles)\n- Épices (commerce lucratif)\n- Main-d''œuvre (esclaves)\n\n3. **Motivations révélées :**\n- Recherche de richesses (\"God, Gold, Glory\")\n- Expansion économique de l''Espagne\n- Justification de l''investissement royal\n- Début de l''exploitation coloniale"
            }
        ]
    }',
    true,
    'public',
    'fr',
    '00000000-0000-0000-0000-000000000001',
    120,
    ARRAY['histoire', 'géographie', 'renaissance', 'découvertes', '2nde']
),

-- Anglais 4ème
(
    'Test d''Anglais - Past Tenses and Vocabulary',
    'Anglais',
    'Évaluation sur les temps du passé et le vocabulaire thématique',
    2024,
    'premier_trimestre',
    'controle',
    (SELECT id FROM classes WHERE name = '4eme' LIMIT 1),
    (SELECT id FROM establishments WHERE name = 'Lycée Moderne de Cocody' LIMIT 1),
    '{
        "questions": [
            {
                "id": 1,
                "type": "grammar",
                "title": "Part I - Grammar: Past Tenses (10 points)",
                "content": "**Complete the sentences with the correct past tense (simple past, past continuous, or past perfect):**\n\n1. Yesterday, I _________ (walk) to school when it _________ (start) raining.\n\n2. By the time we _________ (arrive) at the cinema, the film _________ (already/begin).\n\n3. She _________ (read) a book while her brother _________ (watch) TV.\n\n4. They _________ (not/finish) their homework before their parents _________ (come) home.\n\n5. What _________ you _________ (do) at 8 o''clock last night?",
                "points": 10,
                "solution": "**Answers:**\n\n1. was walking / started\n2. arrived / had already begun\n3. was reading / was watching\n4. hadn''t finished / came\n5. were / doing"
            },
            {
                "id": 2,
                "type": "vocabulary",
                "title": "Part II - Vocabulary: Daily Activities (6 points)",
                "content": "**Match the activities with the correct time expressions:**\n\n**Activities:** have breakfast, do homework, brush teeth, go to bed, attend classes, have dinner\n\n**Time expressions:** in the morning, in the afternoon, in the evening, at night, before school, after school\n\n1. _________ → in the morning\n2. _________ → before school  \n3. _________ → in the afternoon\n4. _________ → after school\n5. _________ → in the evening\n6. _________ → at night",
                "points": 6,
                "solution": "**Suggested answers:**\n\n1. have breakfast → in the morning\n2. brush teeth → before school\n3. attend classes → in the afternoon\n4. do homework → after school\n5. have dinner → in the evening\n6. go to bed → at night"
            },
            {
                "id": 3,
                "type": "reading",
                "title": "Part III - Reading Comprehension (4 points)",
                "content": "**Read the text and answer the questions:**\n\n*\"Last summer, Emma visited her grandmother in London. She had never been to England before. During her stay, she visited many famous places like Big Ben and the Tower Bridge. She also tried traditional English food for the first time. Emma said it was the best holiday she had ever had.\"*\n\n1. **Where did Emma go last summer?**\n2. **Had she been to England before?**\n3. **Name two places she visited.**\n4. **How did she feel about her holiday?**",
                "points": 4,
                "solution": "**Answers:**\n\n1. She went to London (to visit her grandmother).\n2. No, she had never been to England before.\n3. Big Ben and Tower Bridge.\n4. She said it was the best holiday she had ever had."
            }
        ]
    }',
    true,
    'public',
    'fr',
    '00000000-0000-0000-0000-000000000001',
    90,
    ARRAY['anglais', 'past tenses', 'vocabulary', '4ème']
),

-- SVT 5ème
(
    'Évaluation de SVT - La Respiration et la Circulation',
    'SVT',
    'Contrôle sur les appareils respiratoire et circulatoire chez l''Homme',
    2024,
    'deuxieme_trimestre',
    'controle',
    (SELECT id FROM classes WHERE name = '5eme' LIMIT 1),
    (SELECT id FROM establishments WHERE name = 'Collège Sainte-Marie' LIMIT 1),
    '{
        "questions": [
            {
                "id": 1,
                "type": "knowledge",
                "title": "Partie I - Questions de cours (8 points)",
                "content": "**Répondez aux questions suivantes :**\n\n1. **Citez les organes de l''appareil respiratoire. (3 points)**\n\n2. **Qu''est-ce que l''hématose ? Où a-t-elle lieu ? (2 points)**\n\n3. **Nommez les différents types de vaisseaux sanguins et précisez leur rôle. (3 points)**",
                "points": 8,
                "solution": "**Réponses attendues :**\n\n1. **Organes respiratoires :**\n- Fosses nasales\n- Pharynx\n- Larynx\n- Trachée\n- Bronches\n- Bronchioles\n- Alvéoles pulmonaires\n\n2. **Hématose :**\nÉchange gazeux entre l''air et le sang (O₂ entre, CO₂ sort)\nLieu : alvéoles pulmonaires\n\n3. **Vaisseaux sanguins :**\n- Artères : transportent le sang du cœur vers les organes\n- Veines : ramènent le sang des organes vers le cœur\n- Capillaires : permettent les échanges entre sang et cellules"
            },
            {
                "id": 2,
                "type": "diagram",
                "title": "Partie II - Schéma à compléter (7 points)",
                "content": "**Complétez le schéma du cœur en plaçant les termes suivants :**\n\n**Termes à placer :** oreillette droite, oreillette gauche, ventricule droit, ventricule gauche, aorte, artère pulmonaire, veines caves\n\n*[Un schéma du cœur serait fourni avec des flèches à légender]*\n\n**Questions supplémentaires :**\na) **Dans quelle partie du cœur arrive le sang chargé en CO₂ ?**\nb) **D''où part le sang riche en O₂ vers les organes ?**",
                "points": 7,
                "solution": "**Légendes du schéma :**\n- Partie supérieure droite : oreillette droite\n- Partie inférieure droite : ventricule droit\n- Partie supérieure gauche : oreillette gauche\n- Partie inférieure gauche : ventricule gauche\n- Gros vaisseau sortant à gauche : aorte\n- Vaisseau sortant vers les poumons : artère pulmonaire\n- Vaisseaux arrivant à droite : veines caves\n\n**Réponses :**\na) Oreillette droite\nb) Ventricule gauche (via l''aorte)"
            },
            {
                "id": 3,
                "type": "experiment",
                "title": "Partie III - Analyse d''expérience (5 points)",
                "content": "**On mesure les variations du rythme cardiaque d''un élève :**\n\n- Au repos : 70 battements/minute\n- Après un effort : 120 battements/minute\n- 5 minutes après l''effort : 80 battements/minute\n\n**Questions :**\n1. **Que constatez-vous ? (2 points)**\n2. **Expliquez pourquoi le rythme cardiaque augmente pendant l''effort. (3 points)**",
                "points": 5,
                "solution": "**Réponses :**\n\n1. **Constatation :**\nLe rythme cardiaque augmente pendant l''effort puis diminue progressivement au repos.\n\n2. **Explication :**\nPendant l''effort, les muscles ont besoin de plus d''oxygène et de nutriments. Le cœur bat plus vite pour apporter plus de sang aux muscles et éliminer le CO₂ produit plus rapidement."
            }
        ]
    }',
    true,
    'public',
    'fr',
    '00000000-0000-0000-0000-000000000001',
    90,
    ARRAY['svt', 'respiration', 'circulation', 'cœur', '5ème']
);