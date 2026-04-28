"use client";

import { createContext, useContext, useEffect, ReactNode } from "react";
import { Language, translations, Translations } from "./translations";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const defaultContext: LanguageContextType = {
  language: "de",
  setLanguage: () => {},
  t: translations.de as Translations,
};

const LanguageContext = createContext<LanguageContextType>(defaultContext);

export function LanguageProvider({ children }: { children: ReactNode }) {
  // Site is German-only. Earlier versions stored an EN preference in
  // localStorage; clear it so existing users don't get stuck in English.
  useEffect(() => {
    try { localStorage.removeItem("language"); } catch {}
  }, []);

  const language: Language = "de";
  const setLanguage = () => {};
  const t = translations.de;

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
