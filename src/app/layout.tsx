import type {Metadata} from 'next';
import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import SessionProvider from '@/components/session-provider';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import DashboardLayout from './dashboard-layout';

export const metadata: Metadata = {
  title: 'License Data Management',
  description: 'Manage, view, and edit license data, and persist to a database.',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getServerSession(authOptions);

  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="font-body antialiased">
        <SessionProvider session={session}>
            {session ? <DashboardLayout>{children}</DashboardLayout> : children}
        </SessionProvider>
        <Toaster />
      </body>
    </html>
  );
}
