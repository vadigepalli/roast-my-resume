import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Roast My Resume 🔥 | AI-Powered Resume Feedback',
  description: 'Get brutally honest AI feedback on your resume. Find weak spots, missing keywords, and opportunities to stand out.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-sans min-h-screen bg-[#0a0a0a]">
        {children}
      </body>
    </html>
  );
}
