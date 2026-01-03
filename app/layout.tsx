import type { Metadata } from "next";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Tennis Court Booking",
  description: "Book your tennis court time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen antialiased">
        <Providers>
          <Navbar />
          <main className="max-w-5xl mx-auto px-4">{children}</main>
        </Providers>
      </body>
    </html>
  );
}
