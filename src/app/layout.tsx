import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Lift — Workout Tracker',
  description: 'Track your PT workouts',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full" style={{ backgroundColor: '#080808' }}>
        {children}
      </body>
    </html>
  );
}
