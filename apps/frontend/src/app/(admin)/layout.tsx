'use client';

import { Sidebar } from '../../components/Sidebar';
import { SidebarProvider, useSidebar } from '../../contexts/SidebarContext';
import { ProtectedRoute } from '../../components/ProtectedRoute';

function AdminLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isCollapsed } = useSidebar();

  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar />
        <main
          className={`flex-1 transition-all duration-300 ${
            isCollapsed ? 'ml-20' : 'ml-64'
          }`}
        >
          {children}
        </main>
      </div>
    </ProtectedRoute>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SidebarProvider>
      <AdminLayoutContent>{children}</AdminLayoutContent>
    </SidebarProvider>
  );
}
