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