import React, { createContext, useContext, useState, ReactNode } from 'react';

export type Language = 'en' | 'si' | 'ta';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

// Simple translation dictionary
const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    plots: 'Plot Registry',
    workforce: 'Workforce',
    harvest: 'Harvest',
    inventory: 'Inventory',
    attendance: 'Attendance',
    financial: 'Financial',
    'disease-scanner': 'Disease Scanner',
    'ai-assistant': 'AI Assistant',
    tasks: 'Tasks',
    deliveries: 'Deliveries',
    factories: 'Factories',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Logout',

    // Common
    welcome: 'Welcome',
    'select-language': 'Select Language',
    english: 'English',
    sinhala: 'Sinhala',
    tamil: 'Tamil',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    add: 'Add',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    'no-data': 'No data available',
  },
  si: {
    dashboard: 'උපකරණ පුවරුව',
    plots: 'ඉඩම් ලියාපදිංචිය',
    workforce: 'ශ්‍රම බලකාය',
    harvest: 'අස්වැන්න',
    inventory: 'ඉන්වෙන්ටරි',
    attendance: 'පැමිණීම',
    financial: 'මූල්‍ය',
    'disease-scanner': 'රෝග ස්කෑනරය',
    'ai-assistant': 'AI සහායක',
    tasks: 'කාර්යයන්',
    deliveries: 'බෙදාහැරීම්',
    factories: 'කර්මාන්තශාලා',
    reports: 'වාර්තා',
    settings: 'සැකසීම්',
    logout: 'ඉවත්වන්න',
    welcome: 'සාදරයෙන් පිළිගනිමු',
    'select-language': 'භාෂාව තෝරන්න',
    english: 'ඉංග්‍රීසි',
    sinhala: 'සිංහල',
    tamil: 'දෙමළ',
    save: 'සුරකින්න',
    cancel: 'අවලංගු කරන්න',
    delete: 'මකන්න',
    edit: 'සංස්කරණය',
    add: 'එකතු කරන්න',
    search: 'සොයන්න',
    filter: 'පෙරහන',
    export: 'අපනයනය',
    'no-data': 'දත්ත නැත',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    plots: 'நில பதிவு',
    workforce: 'பணியாளர்கள்',
    harvest: 'அறுவடை',
    inventory: 'சரக்கு',
    attendance: 'வருகை',
    financial: 'நிதி',
    'disease-scanner': 'நோய் ஸ்கேனர்',
    'ai-assistant': 'AI உதவியாளர்',
    tasks: 'பணிகள்',
    deliveries: 'விநியோகங்கள்',
    factories: 'தொழிற்சாலைகள்',
    reports: 'அறிக்கைகள்',
    settings: 'அமைப்புகள்',
    logout: 'வெளியேறு',
    welcome: 'வரவேற்கிறோம்',
    'select-language': 'மொழியைத் தேர்ந்தெடுக்கவும்',
    english: 'ஆங்கிலம்',
    sinhala: 'சிங்களம்',
    tamil: 'தமிழ்',
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    add: 'சேர்',
    search: 'தேடு',
    filter: 'வடிகட்டு',
    export: 'ஏற்றுமதி',
    'no-data': 'தரவு இல்லை',
  },
};

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>('en');

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
