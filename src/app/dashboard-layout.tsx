
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Sidebar,
  SidebarProvider,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarHeader,
  SidebarTrigger,
  SidebarFooter,
} from '@/components/ui/sidebar';
import { Building, FileText, LibrarySquare, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { signOut } from 'next-auth/react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useSession } from 'next-auth/react';


const menuItems = [
  { href: '/', label: 'Licenses', icon: LibrarySquare },
  { href: '/suppliers', label: 'Suppliers', icon: Building },
  { href: '/rda', label: 'RDAs', icon: FileText },
];

const SidebarTitle = ({ children }: { children: React.ReactNode }) => (
    <div className="text-lg font-semibold text-sidebar-foreground">{children}</div>
);


export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2">
            <SidebarTitle>License Manager</SidebarTitle>
          </div>
        </SidebarHeader>
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <SidebarFooter className="mt-auto">
            <div className="flex items-center gap-2 p-2">
                <Avatar className="h-9 w-9">
                    <AvatarFallback>{session?.user?.name?.[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="flex flex-col">
                    <span className="text-sm font-medium text-sidebar-foreground">
                        {session?.user?.name}
                    </span>
                    <span className="text-xs text-sidebar-foreground/70">
                        {session?.user?.email}
                    </span>
                </div>
            </div>
          <Button onClick={() => signOut()} variant="ghost" className="w-full justify-start text-sidebar-foreground/70 hover:bg-sidebar-accent">
            <LogOut />
            <span>Sign Out</span>
          </Button>
        </SidebarFooter>
      </Sidebar>
      <SidebarInset>
        <header className="flex items-center justify-between p-2 md:hidden">
            <SidebarTrigger />
        </header>
        <main className="p-4 md:p-8">
            {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
