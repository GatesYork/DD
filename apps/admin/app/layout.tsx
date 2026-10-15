import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = { title: 'DD · Campus operations', description: 'Designated Driver pilot operations demo' };
export default function Layout({ children }: { children: React.ReactNode }) { return <html lang="en"><body>{children}</body></html>; }
