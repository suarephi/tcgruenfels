"use client";

import { ReactNode } from "react";
import { LanguageProvider } from "@/lib/LanguageContext";

export default function Providers({ children }: { children: ReactNode }) {
  return <LanguageProvider>{children}</LanguageProvider>;
}
