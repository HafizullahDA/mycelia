import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'myCELIA',
  description: 'AI-powered UPSC exam preparation platform.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}