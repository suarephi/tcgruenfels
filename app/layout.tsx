import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "TC Grünfels - Platzbuchung",
  description: "Tennisplatz Buchung - TC Grünfels",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body className="min-h-screen antialiased">
        <Providers>
          {/* Decorative background elements */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            {/* Subtle gradient orbs */}
            <div
              className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-30"
              style={{
                background: 'radial-gradient(circle, var(--forest-200) 0%, transparent 70%)',
              }}
            />
            <div
              className="absolute top-1/2 -left-40 w-80 h-80 rounded-full opacity-20"
              style={{
                background: 'radial-gradient(circle, var(--terracotta-300) 0%, transparent 70%)',
              }}
            />
          </div>

          <div className="relative">
            <Navbar />
            <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-16">
              {children}
            </main>

            {/* Footer */}
            <footer className="border-t border-[var(--stone-200)] mt-auto">
              <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                  <div className="flex items-center gap-3">
                    <div className="tennis-ball scale-75" />
                    <span className="text-[var(--stone-500)] text-sm">
                      TC Grünfels
                    </span>
                  </div>
                  <p className="text-[var(--stone-400)] text-sm">
                    Tennisclub seit 1962
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </Providers>
      </body>
    </html>
  );
}
