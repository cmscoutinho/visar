import type { Metadata } from 'next';
// Removed: import { GeistSans } from 'geist/font/sans';
// Removed: import { GeistMono } from 'geist/font/mono';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Removed: const geistSans = GeistSans; // Use GeistSans directly
// Removed: const geistMono = GeistMono; // Use GeistMono directly

export const metadata: Metadata = {
  title: 'VISAR',
  description: 'Plataforma interativa que simula deficiências visuais para promover conscientização e empatia.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
