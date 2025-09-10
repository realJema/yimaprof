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