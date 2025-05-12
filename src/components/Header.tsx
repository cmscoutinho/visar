import { Eye } from 'lucide-react';
import Link from 'next/link';

export default function Header() {
  return (
    <header className="bg-primary text-primary-foreground shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 transition-opacity hover:opacity-80">
          <Eye size={36} aria-hidden="true" />
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">VISAR</h1>
        </Link>
        {/* Future navigation links can be added here */}
      </div>
    </header>
  );
}
