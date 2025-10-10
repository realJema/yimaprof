import React, { createContext, useContext, useState, useEffect } from 'react';

interface LanguageContextType {
  language: 'fr' | 'en';
  setLanguage: (lang: 'fr' | 'en') => void;
  t: (key: string) => string;
}

const translations = {
  fr: {
    // Navigation
    dashboard: 'Tableau de bord',
    exams: 'Examens',
    profile: 'Profil',
    settings: 'Paramètres',
    logout: 'Déconnexion',
    
    // Sections
    francophone: 'Section Francophone',
    anglophone: 'Section Anglophone',
    
    // Homepage
    hero_title: 'Réussissez vos examens avec',
    hero_subtitle: 'La plateforme éducative qui révolutionne l\'apprentissage en Afrique. Accédez à des milliers de sujets d\'examens, corrections détaillées et révisez partout.',
    get_started_free: 'Commencer gratuitement',
    sign_in: 'Se connecter',
    explore_exams: 'Explorer les examens',
    free_no_commitment: 'Gratuit • Sans engagement • Accès immédiat',
    
    // Features
    why_choose: 'Pourquoi choisir YIMA ?',
    why_choose_subtitle: 'Une plateforme pensée pour les étudiants africains, avec les outils dont vous avez besoin pour exceller dans vos études.',
    advanced_search: 'Recherche avancée',
    advanced_search_desc: 'Trouvez facilement les sujets par matière, classe, année et établissement',
    offline_access: 'Accès hors-ligne',
    offline_access_desc: 'Téléchargez vos sujets et révisez même sans connexion internet',
    community: 'Communauté',
    community_desc: 'Rejoignez des milliers d\'étudiants qui réussissent avec YIMA',
    multilingual: 'Multilingue',
    multilingual_desc: 'Interface disponible en français et en anglais',
    
    // How it works
    how_it_works: 'Comment ça marche ?',
    how_it_works_subtitle: 'Simple et efficace, YIMA vous accompagne dans votre réussite scolaire en quelques étapes.',
    step_1_title: 'Créez votre compte',
    step_1_desc: 'Inscrivez-vous gratuitement en quelques minutes et accédez immédiatement à notre base de données.',
    step_2_title: 'Choisissez votre section',
    step_2_desc: 'Sélectionnez entre la section francophone ou anglophone selon votre système éducatif.',
    step_3_title: 'Recherchez vos sujets',
    step_3_desc: 'Utilisez nos filtres avancés pour trouver les examens de votre classe et matière.',
    step_4_title: 'Révisez et réussissez',
    step_4_desc: 'Téléchargez, révisez avec les corrections et maximisez vos chances de réussite.',
    
    // Stats
    exam_papers: 'Sujets d\'examens',
    active_students: 'Étudiants actifs',
    schools: 'Établissements',
    satisfaction: 'Taux de satisfaction',
    
    // CTA
    cta_title: 'Prêt à transformer votre façon d\'apprendre ?',
    cta_subtitle: 'Rejoignez des milliers d\'étudiants qui ont déjà amélioré leurs résultats grâce à YIMA. Commencez dès aujourd\'hui !',
    explore_now: 'Explorer maintenant',
    create_account: 'Créer mon compte gratuit',
    view_subscriptions: 'Voir les abonnements',
    
    // Footer
    about_yima: 'La plateforme éducative qui révolutionne l\'apprentissage en Afrique. Accédez à des milliers de sujets d\'examens et corrections détaillées.',
    platform: 'Plateforme',
    company: 'Entreprise',
    about_us: 'À propos',
    contact: 'Contact',
    privacy_policy: 'Politique de confidentialité',
    terms_of_service: 'Conditions d\'utilisation',
    stay_updated: 'Restez informé',
    newsletter_desc: 'Recevez les derniers sujets d\'examens, conseils d\'étude et mises à jour dans votre boîte mail.',
    subscribe: 'S\'abonner',
    enter_email: 'Entrez votre email',
    follow_us: 'Suivez-nous',
    rights_reserved: 'Tous droits réservés. Fait avec ❤️ pour les étudiants africains.',
    
    // Classes
    'class_6e': 'Sixième (6e)',
    'class_5e': 'Cinquième (5e)',
    'class_4e': 'Quatrième (4e)',
    'class_3e': 'Troisième (3e)',
    'class_2nd': 'Seconde (2nd)',
    'class_1ere': 'Première (1ère)',
    'class_tle': 'Terminale (Tle)',
    'form_1': 'Form 1',
    'form_2': 'Form 2',
    'form_3': 'Form 3',
    'form_4': 'Form 4',
    'form_5': 'Form 5',
    'lower_sixth': 'Lower Sixth',
    'upper_sixth': 'Upper Sixth',
    
    // Common
    welcome: 'Bienvenue',
    loading: 'Chargement...',
    error: 'Erreur',
    search: 'Rechercher',
    filter: 'Filtrer',
    download: 'Télécharger',
    view_correction: 'Voir la correction',
    back: 'Retour',
    select_class: 'Sélectionnez une classe',
    no_exams: 'Aucun examen disponible',
    
    // Dashboard
    recent_activity: 'Activité récente',
    my_downloads: 'Mes téléchargements',
    subscription_status: 'Statut abonnement',
    
    // Profile
    personal_info: 'Informations personnelles',
    first_name: 'Prénom',
    last_name: 'Nom',
    email: 'Email',
    phone: 'Téléphone',
    establishment: 'Établissement',
    class_level: 'Niveau de classe',
    save_changes: 'Enregistrer',
    
    // Settings
    language_settings: 'Paramètres de langue',
    notification_settings: 'Paramètres de notification',
    account_settings: 'Paramètres du compte',
    change_password: 'Changer le mot de passe',
    
    // About Page
    about_title: 'À propos de YIMA',
    about_description: 'Découvrez l\'histoire, la mission et les valeurs qui guident YIMA dans sa mission d\'améliorer l\'éducation en Afrique.',
    our_mission: 'Notre Mission',
    mission_description: 'YIMA s\'engage à démocratiser l\'accès à une éducation de qualité en Afrique en fournissant aux étudiants les outils et ressources nécessaires pour exceller dans leurs études. Nous croyons que chaque étudiant mérite d\'avoir accès aux meilleures ressources éducatives, peu importe sa situation géographique ou économique.',
    our_values: 'Nos Valeurs',
    excellence: 'Excellence',
    excellence_desc: 'Nous nous efforçons de maintenir les plus hauts standards de qualité dans tout ce que nous faisons.',
    accessibility: 'Accessibilité',
    accessibility_desc: 'L\'éducation doit être accessible à tous, partout et à tout moment.',
    diversity: 'Diversité',
    diversity_desc: 'Nous célébrons la richesse culturelle et linguistique de l\'Afrique.',
    innovation: 'Innovation',
    innovation_desc: 'Nous utilisons la technologie pour transformer l\'expérience d\'apprentissage.',
    our_story: 'Notre Histoire',
    story_paragraph_1: 'YIMA est née d\'une vision simple mais puissante : révolutionner l\'éducation en Afrique grâce à la technologie. Fondée par une équipe passionnée d\'éducateurs et de technologues africains, notre plateforme répond aux défis spécifiques auxquels font face les étudiants africains.',
    story_paragraph_2: 'En observant les difficultés d\'accès aux ressources éducatives de qualité, nous avons décidé de créer une solution qui combine l\'expertise pédagogique locale avec les dernières innovations technologiques. Notre objectif est de créer un écosystème éducatif qui respecte et valorise la diversité culturelle africaine.',
    story_paragraph_3: 'Aujourd\'hui, YIMA sert des milliers d\'étudiants à travers l\'Afrique, leur offrant les outils nécessaires pour réussir leurs examens et construire un avenir brillant. Nous continuons d\'évoluer et d\'innover pour mieux servir notre communauté grandissante.',
    join_us: 'Rejoignez-nous',
    join_us_description: 'Faites partie de la révolution éducative africaine. Ensemble, construisons un avenir où chaque étudiant a les moyens de réussir.',
    contact_us: 'Nous contacter',
    
    // Contact Page
    contact_description: 'Une question, une suggestion ou besoin d\'aide ? Notre équipe est là pour vous accompagner dans votre parcours éducatif.',
    send_message: 'Envoyer un message',
    subject: 'Sujet',
    message: 'Message',
    contact_info: 'Informations de contact',
    address: 'Adresse',
    hours: 'Heures d\'ouverture',
    support_hours: 'Lundi - Vendredi: 8h00 - 18h00 WAT',
    faq_title: 'Questions fréquentes',
    faq_1_question: 'Comment puis-je accéder aux examens ?',
    faq_1_answer: 'Créez un compte gratuit et naviguez dans notre base de données d\'examens par classe et matière.',
    faq_2_question: 'Les corrections sont-elles disponibles ?',
    faq_2_answer: 'Oui, la plupart de nos examens incluent des corrections détaillées pour vous aider à comprendre.',
    faq_3_question: 'Puis-je télécharger les examens ?',
    faq_3_answer: 'Avec un abonnement, vous pouvez télécharger les examens pour étudier hors ligne.',
    
    // Privacy Policy
    privacy_last_updated: 'Dernière mise à jour : 24 septembre 2025',
    privacy_introduction_title: 'Introduction',
    privacy_introduction: 'YIMA s\'engage à protéger votre vie privée. Cette politique explique comment nous collectons, utilisons et protégeons vos informations personnelles lorsque vous utilisez notre plateforme éducative.',
    privacy_data_collection_title: 'Collecte des données',
    privacy_data_collection: 'Nous collectons les types d\'informations suivants :',
    privacy_data_personal: 'Informations personnelles (nom, email, téléphone)',
    privacy_data_academic: 'Informations académiques (classe, établissement, préférences)',
    privacy_data_usage: 'Données d\'utilisation (pages visitées, examens consultés)',
    privacy_data_technical: 'Informations techniques (adresse IP, type de navigateur)',
    privacy_data_use_title: 'Utilisation des données',
    privacy_data_use: 'Nous utilisons vos données pour :',
    privacy_use_service: 'Fournir et améliorer nos services éducatifs',
    privacy_use_personalization: 'Personnaliser votre expérience d\'apprentissage',
    privacy_use_communication: 'Communiquer avec vous sur nos services',
    privacy_use_improvement: 'Analyser et améliorer notre plateforme',
    privacy_use_security: 'Assurer la sécurité de notre plateforme',
    privacy_data_sharing_title: 'Partage des données',
    privacy_data_sharing: 'Nous ne partageons vos données qu\'en cas de :',
    privacy_sharing_consent: 'Consentement explicite de votre part',
    privacy_sharing_legal: 'Obligation légale ou réglementaire',
    privacy_sharing_partners: 'Partenaires de confiance (avec anonymisation)',
    privacy_sharing_business: 'Transfert d\'entreprise (avec notification préalable)',
    privacy_security_title: 'Sécurité',
    privacy_security: 'Nous mettons en place des mesures de sécurité techniques et organisationnelles appropriées pour protéger vos données contre tout accès, modification, divulgation ou destruction non autorisés.',
    privacy_rights_title: 'Vos droits',
    privacy_rights: 'Vous avez le droit de :',
    privacy_right_access: 'Accéder à vos données personnelles',
    privacy_right_rectification: 'Rectifier vos données inexactes',
    privacy_right_erasure: 'Supprimer vos données (droit à l\'oubli)',
    privacy_right_portability: 'Transférer vos données vers un autre service',
    privacy_right_objection: 'Vous opposer au traitement de vos données',
    privacy_cookies_title: 'Cookies',
    privacy_cookies: 'Nous utilisons des cookies pour améliorer votre expérience, analyser l\'utilisation du site et personnaliser le contenu. Vous pouvez gérer vos préférences de cookies dans les paramètres de votre navigateur.',
    privacy_changes_title: 'Modifications',
    privacy_changes: 'Nous pouvons modifier cette politique de confidentialité. Les modifications importantes seront communiquées par email ou notification sur la plateforme.',
    privacy_contact_title: 'Contact',
    privacy_contact: 'Pour toute question concernant cette politique de confidentialité :',
    
    // Terms of Service
    terms_last_updated: 'Dernière mise à jour : 24 septembre 2025',
    terms_acceptance_title: 'Acceptation des conditions',
    terms_acceptance: 'En utilisant YIMA, vous acceptez ces conditions d\'utilisation. Si vous n\'acceptez pas ces conditions, veuillez ne pas utiliser notre plateforme.',
    terms_description_title: 'Description du service',
    terms_description: 'YIMA est une plateforme éducative qui fournit l\'accès à des examens, corrections et ressources pédagogiques pour les étudiants africains des sections francophone et anglophone.',
    terms_user_accounts_title: 'Comptes utilisateur',
    terms_user_accounts: 'Pour utiliser certaines fonctionnalités, vous devez créer un compte. Vous vous engagez à :',
    terms_account_accuracy: 'Fournir des informations exactes et complètes',
    terms_account_security: 'Maintenir la sécurité de votre mot de passe',
    terms_account_responsibility: 'Être responsable de toute activité sur votre compte',
    terms_account_age: 'Avoir au moins 13 ans ou l\'autorisation parentale',
    terms_use_rules_title: 'Règles d\'utilisation',
    terms_use_rules: 'Vous vous engagez à utiliser YIMA de manière légale et respectueuse :',
    terms_rule_legal: 'Respecter toutes les lois applicables',
    terms_rule_respect: 'Traiter les autres utilisateurs avec respect',
    terms_rule_no_sharing: 'Ne pas partager vos identifiants de compte',
    terms_rule_no_reverse: 'Ne pas faire d\'ingénierie inverse de notre plateforme',
    terms_rule_no_automated: 'Ne pas utiliser de systèmes automatisés pour accéder au service',
    terms_intellectual_property_title: 'Propriété intellectuelle',
    terms_intellectual_property: 'Tout le contenu de YIMA (examens, corrections, interface) est protégé par les droits d\'auteur. Vous pouvez utiliser ce contenu à des fins éducatives personnelles uniquement.',
    terms_subscriptions_title: 'Abonnements et paiements',
    terms_subscriptions: 'Pour les services premium :',
    terms_subscription_billing: 'Les frais sont facturés à l\'avance pour chaque période',
    terms_subscription_renewal: 'Les abonnements se renouvellent automatiquement',
    terms_subscription_cancellation: 'Vous pouvez annuler à tout moment',
    terms_subscription_refund: 'Les remboursements sont soumis à notre politique de remboursement',
    terms_termination_title: 'Résiliation',
    terms_termination: 'Nous nous réservons le droit de suspendre ou résilier votre compte en cas de violation de ces conditions ou d\'utilisation abusive de la plateforme.',
    terms_disclaimer_title: 'Disclaimer',
    terms_disclaimer: 'YIMA est fourni "en l\'état" sans garantie d\'aucune sorte. Nous ne garantissons pas que le service sera ininterrompu ou exempt d\'erreurs.',
    terms_limitation_title: 'Limitation de responsabilité',
    terms_limitation: 'Dans les limites autorisées par la loi, YIMA ne sera pas responsable des dommages indirects, consécutifs ou punitifs résultant de votre utilisation du service.',
    terms_governing_law_title: 'Droit applicable',
    terms_governing_law: 'Ces conditions sont régies par les lois du Cameroun. Tout litige sera soumis aux tribunaux compétents de Yaoundé.',
    terms_changes_title: 'Modifications des conditions',
    terms_changes: 'Nous pouvons modifier ces conditions. Les modifications importantes seront communiquées avec un préavis de 30 jours.',
    terms_contact_title: 'Contact',
    terms_contact: 'Pour toute question concernant ces conditions d\'utilisation :',
    
    // Admin Page
    admin_dashboard: 'Tableau de bord administrateur',
    platform_management: 'Gestion de la plateforme et analytiques',
    admin_access: 'Accès administrateur',
    overview: 'Vue d\'ensemble',
    users: 'Utilisateurs',
    classes: 'Classes',
    plans: 'Plans',
    subscriptions: 'Abonnements',
    transactions: 'Transactions',
    platform_overview: 'Aperçu de la plateforme',
    total_revenue: 'Revenu total',
    updated_realtime: 'Mis à jour en temps réel',
    active_users: 'Utilisateurs actifs',
    last_30_days: '30 derniers jours',
    platform_health: 'Santé de la plateforme',
    excellent: 'Excellent',
    quick_navigation: 'Navigation rapide',
    quick_nav_desc: 'Utilisez le menu de navigation pour gérer différentes sections :',
    users_manage_desc: 'Gérer les comptes utilisateurs et les rôles',
    exams_manage_desc: 'Opérations CRUD pour les sujets d\'examen',
    classes_manage_desc: 'Gérer les classes éducatives',
    plans_manage_desc: 'Gestion des plans d\'abonnement',
    subscriptions_manage_desc: 'Voir les abonnements actifs',
    transactions_manage_desc: 'Historique des transactions financières',
    please_sign_in_admin: 'Veuillez vous connecter pour accéder au panneau d\'administration',
    loading_admin_panel: 'Chargement du panneau d\'administration...',
    access_denied: 'Accès refusé',
    no_admin_privileges: 'Vous n\'avez pas les privilèges d\'administrateur pour accéder à cette page.',
    access_denied_desc: 'Vous n\'avez pas les privilèges d\'administrateur',
  },
  en: {
    // Navigation
    dashboard: 'Dashboard',
    exams: 'Exams',
    profile: 'Profile',
    settings: 'Settings',
    logout: 'Logout',
    
    // Sections
    francophone: 'Francophone Section',
    anglophone: 'Anglophone Section',
    
    // Homepage
    hero_title: 'Succeed in your exams with',
    hero_subtitle: 'The educational platform that revolutionizes learning in Africa. Access thousands of exam papers, detailed corrections and study anywhere.',
    get_started_free: 'Get Started Free',
    sign_in: 'Sign In',
    explore_exams: 'Explore Exams',
    free_no_commitment: 'Free • No commitment • Instant access',
    
    // Features
    why_choose: 'Why choose YIMA?',
    why_choose_subtitle: 'A platform designed for African students, with the tools you need to excel in your studies.',
    advanced_search: 'Advanced Search',
    advanced_search_desc: 'Easily find papers by subject, class, year and institution',
    offline_access: 'Offline Access',
    offline_access_desc: 'Download your papers and study even without internet connection',
    community: 'Community',
    community_desc: 'Join thousands of students who succeed with YIMA',
    multilingual: 'Multilingual',
    multilingual_desc: 'Interface available in French and English',
    
    // How it works
    how_it_works: 'How it works?',
    how_it_works_subtitle: 'Simple and efficient, YIMA guides you to academic success in just a few steps.',
    step_1_title: 'Create your account',
    step_1_desc: 'Sign up for free in minutes and get instant access to our database.',
    step_2_title: 'Choose your section',
    step_2_desc: 'Select between Francophone or Anglophone section according to your educational system.',
    step_3_title: 'Search your papers',
    step_3_desc: 'Use our advanced filters to find exams for your class and subject.',
    step_4_title: 'Study and succeed',
    step_4_desc: 'Download, study with corrections and maximize your chances of success.',
    
    // Stats
    exam_papers: 'Exam Papers',
    active_students: 'Active Students',
    schools: 'Schools',
    satisfaction: 'Satisfaction Rate',
    
    // CTA
    cta_title: 'Ready to transform your way of learning?',
    cta_subtitle: 'Join thousands of students who have already improved their results with YIMA. Start today!',
    explore_now: 'Explore Now',
    create_account: 'Create Free Account',
    view_subscriptions: 'View Subscriptions',
    
    // Footer
    about_yima: 'The educational platform that revolutionizes learning in Africa. Access thousands of exam papers and detailed corrections.',
    platform: 'Platform',
    company: 'Company',
    about_us: 'About Us',
    contact: 'Contact',
    privacy_policy: 'Privacy Policy',
    terms_of_service: 'Terms of Service',
    stay_updated: 'Stay Updated',
    newsletter_desc: 'Get the latest exam papers, study tips, and platform updates delivered to your inbox.',
    subscribe: 'Subscribe',
    enter_email: 'Enter your email',
    follow_us: 'Follow us',
    rights_reserved: 'All rights reserved. Made with ❤️ for African students.',
    
    // Classes
    'class_6e': 'Form 1 (6e)',
    'class_5e': 'Form 2 (5e)',
    'class_4e': 'Form 3 (4e)',
    'class_3e': 'Form 4 (3e)',
    'class_2nd': 'Form 5 (2nd)',
    'class_1ere': 'Lower Sixth (1ère)',
    'class_tle': 'Upper Sixth (Tle)',
    'form_1': 'Form 1',
    'form_2': 'Form 2',
    'form_3': 'Form 3',
    'form_4': 'Form 4',
    'form_5': 'Form 5',
    'lower_sixth': 'Lower Sixth',
    'upper_sixth': 'Upper Sixth',
    
    // Common
    welcome: 'Welcome',
    loading: 'Loading...',
    error: 'Error',
    search: 'Search',
    filter: 'Filter',
    download: 'Download',
    view_correction: 'View correction',
    back: 'Back',
    select_class: 'Select a class',
    no_exams: 'No exams available',
    
    // Dashboard
    recent_activity: 'Recent Activity',
    my_downloads: 'My Downloads',
    subscription_status: 'Subscription Status',
    
    // Profile
    personal_info: 'Personal Information',
    first_name: 'First Name',
    last_name: 'Last Name',
    email: 'Email',
    phone: 'Phone',
    establishment: 'Establishment',
    class_level: 'Class Level',
    save_changes: 'Save Changes',
    
    // Settings
    language_settings: 'Language Settings',
    notification_settings: 'Notification Settings',
    account_settings: 'Account Settings',
    change_password: 'Change Password',
    
    // About Page
    about_title: 'About YIMA',
    about_description: 'Discover the story, mission and values that guide YIMA in its mission to improve education in Africa.',
    our_mission: 'Our Mission',
    mission_description: 'YIMA is committed to democratizing access to quality education in Africa by providing students with the tools and resources needed to excel in their studies. We believe every student deserves access to the best educational resources, regardless of their geographical or economic situation.',
    our_values: 'Our Values',
    excellence: 'Excellence',
    excellence_desc: 'We strive to maintain the highest standards of quality in everything we do.',
    accessibility: 'Accessibility',
    accessibility_desc: 'Education should be accessible to everyone, everywhere and at any time.',
    diversity: 'Diversity',
    diversity_desc: 'We celebrate the cultural and linguistic richness of Africa.',
    innovation: 'Innovation',
    innovation_desc: 'We use technology to transform the learning experience.',
    our_story: 'Our Story',
    story_paragraph_1: 'YIMA was born from a simple but powerful vision: to revolutionize education in Africa through technology. Founded by a passionate team of African educators and technologists, our platform addresses the specific challenges faced by African students.',
    story_paragraph_2: 'By observing the difficulties in accessing quality educational resources, we decided to create a solution that combines local pedagogical expertise with the latest technological innovations. Our goal is to create an educational ecosystem that respects and values African cultural diversity.',
    story_paragraph_3: 'Today, YIMA serves thousands of students across Africa, providing them with the tools they need to succeed in their exams and build a bright future. We continue to evolve and innovate to better serve our growing community.',
    join_us: 'Join Us',
    join_us_description: 'Be part of the African educational revolution. Together, let\'s build a future where every student has the means to succeed.',
    contact_us: 'Contact Us',
    
    // Contact Page
    contact_description: 'Have a question, suggestion or need help? Our team is here to support you in your educational journey.',
    send_message: 'Send Message',
    subject: 'Subject',
    message: 'Message',
    contact_info: 'Contact Information',
    address: 'Address',
    hours: 'Business Hours',
    support_hours: 'Monday - Friday: 8:00 AM - 6:00 PM WAT',
    faq_title: 'Frequently Asked Questions',
    faq_1_question: 'How can I access exams?',
    faq_1_answer: 'Create a free account and browse our exam database by class and subject.',
    faq_2_question: 'Are corrections available?',
    faq_2_answer: 'Yes, most of our exams include detailed corrections to help you understand.',
    faq_3_question: 'Can I download exams?',
    faq_3_answer: 'With a subscription, you can download exams to study offline.',
    
    // Privacy Policy
    privacy_last_updated: 'Last updated: September 24, 2025',
    privacy_introduction_title: 'Introduction',
    privacy_introduction: 'YIMA is committed to protecting your privacy. This policy explains how we collect, use and protect your personal information when you use our educational platform.',
    privacy_data_collection_title: 'Data Collection',
    privacy_data_collection: 'We collect the following types of information:',
    privacy_data_personal: 'Personal information (name, email, phone)',
    privacy_data_academic: 'Academic information (class, institution, preferences)',
    privacy_data_usage: 'Usage data (pages visited, exams viewed)',
    privacy_data_technical: 'Technical information (IP address, browser type)',
    privacy_data_use_title: 'Data Use',
    privacy_data_use: 'We use your data to:',
    privacy_use_service: 'Provide and improve our educational services',
    privacy_use_personalization: 'Personalize your learning experience',
    privacy_use_communication: 'Communicate with you about our services',
    privacy_use_improvement: 'Analyze and improve our platform',
    privacy_use_security: 'Ensure the security of our platform',
    privacy_data_sharing_title: 'Data Sharing',
    privacy_data_sharing: 'We only share your data in case of:',
    privacy_sharing_consent: 'Your explicit consent',
    privacy_sharing_legal: 'Legal or regulatory obligation',
    privacy_sharing_partners: 'Trusted partners (with anonymization)',
    privacy_sharing_business: 'Business transfer (with prior notification)',
    privacy_security_title: 'Security',
    privacy_security: 'We implement appropriate technical and organizational security measures to protect your data against unauthorized access, modification, disclosure or destruction.',
    privacy_rights_title: 'Your Rights',
    privacy_rights: 'You have the right to:',
    privacy_right_access: 'Access your personal data',
    privacy_right_rectification: 'Rectify your inaccurate data',
    privacy_right_erasure: 'Delete your data (right to be forgotten)',
    privacy_right_portability: 'Transfer your data to another service',
    privacy_right_objection: 'Object to the processing of your data',
    privacy_cookies_title: 'Cookies',
    privacy_cookies: 'We use cookies to improve your experience, analyze site usage and personalize content. You can manage your cookie preferences in your browser settings.',
    privacy_changes_title: 'Changes',
    privacy_changes: 'We may modify this privacy policy. Important changes will be communicated by email or notification on the platform.',
    privacy_contact_title: 'Contact',
    privacy_contact: 'For any questions regarding this privacy policy:',
    
    // Terms of Service
    terms_last_updated: 'Last updated: September 24, 2025',
    terms_acceptance_title: 'Acceptance of Terms',
    terms_acceptance: 'By using YIMA, you accept these terms of use. If you do not accept these terms, please do not use our platform.',
    terms_description_title: 'Service Description',
    terms_description: 'YIMA is an educational platform that provides access to exams, corrections and educational resources for African students in Francophone and Anglophone sections.',
    terms_user_accounts_title: 'User Accounts',
    terms_user_accounts: 'To use certain features, you must create an account. You agree to:',
    terms_account_accuracy: 'Provide accurate and complete information',
    terms_account_security: 'Maintain the security of your password',
    terms_account_responsibility: 'Be responsible for all activity on your account',
    terms_account_age: 'Be at least 13 years old or have parental authorization',
    terms_use_rules_title: 'Usage Rules',
    terms_use_rules: 'You agree to use YIMA legally and respectfully:',
    terms_rule_legal: 'Comply with all applicable laws',
    terms_rule_respect: 'Treat other users with respect',
    terms_rule_no_sharing: 'Not share your account credentials',
    terms_rule_no_reverse: 'Not reverse engineer our platform',
    terms_rule_no_automated: 'Not use automated systems to access the service',
    terms_intellectual_property_title: 'Intellectual Property',
    terms_intellectual_property: 'All YIMA content (exams, corrections, interface) is protected by copyright. You may use this content for personal educational purposes only.',
    terms_subscriptions_title: 'Subscriptions and Payments',
    terms_subscriptions: 'For premium services:',
    terms_subscription_billing: 'Fees are charged in advance for each period',
    terms_subscription_renewal: 'Subscriptions renew automatically',
    terms_subscription_cancellation: 'You can cancel at any time',
    terms_subscription_refund: 'Refunds are subject to our refund policy',
    terms_termination_title: 'Termination',
    terms_termination: 'We reserve the right to suspend or terminate your account in case of violation of these terms or misuse of the platform.',
    terms_disclaimer_title: 'Disclaimer',
    terms_disclaimer: 'YIMA is provided "as is" without warranty of any kind. We do not guarantee that the service will be uninterrupted or error-free.',
    terms_limitation_title: 'Limitation of Liability',
    terms_limitation: 'To the extent permitted by law, YIMA will not be liable for indirect, consequential or punitive damages resulting from your use of the service.',
    terms_governing_law_title: 'Governing Law',
    terms_governing_law: 'These terms are governed by the laws of Cameroon. Any dispute will be submitted to the competent courts of Yaoundé.',
    terms_changes_title: 'Changes to Terms',
    terms_changes: 'We may modify these terms. Important changes will be communicated with 30 days notice.',
    terms_contact_title: 'Contact',
    terms_contact: 'For any questions regarding these terms of use:',
    
    // Admin Page
    admin_dashboard: 'Admin Dashboard',
    platform_management: 'Platform management and analytics',
    admin_access: 'Admin Access',
    overview: 'Overview',
    users: 'Users',
    classes: 'Classes',
    plans: 'Plans',
    subscriptions: 'Subscriptions',
    transactions: 'Transactions',
    platform_overview: 'Platform Overview',
    total_revenue: 'Total Revenue',
    updated_realtime: 'Updated in real-time',
    active_users: 'Active Users',
    last_30_days: 'Last 30 days',
    platform_health: 'Platform Health',
    excellent: 'Excellent',
    quick_navigation: 'Quick Navigation',
    quick_nav_desc: 'Use the navigation menu to manage different sections:',
    users_manage_desc: 'Manage user accounts and roles',
    exams_manage_desc: 'CRUD operations for exam papers',
    classes_manage_desc: 'Manage educational classes',
    plans_manage_desc: 'Subscription plan management',
    subscriptions_manage_desc: 'View active subscriptions',
    transactions_manage_desc: 'Financial transaction history',
    please_sign_in_admin: 'Please sign in to access admin panel',
    loading_admin_panel: 'Loading admin panel...',
    access_denied: 'Access Denied',
    no_admin_privileges: 'You do not have admin privileges to access this page.',
    access_denied_desc: 'You do not have admin privileges',
  }
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<'fr' | 'en'>('fr');

  useEffect(() => {
    const savedLanguage = localStorage.getItem('yima-language') as 'fr' | 'en';
    if (savedLanguage) {
      setLanguage(savedLanguage);
    }
  }, []);

  const handleSetLanguage = (lang: 'fr' | 'en') => {
    setLanguage(lang);
    localStorage.setItem('yima-language', lang);
  };

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations['fr']] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage: handleSetLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};