import React from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar, TopBar } from './Navigation';

export function AppLayout({ onLogout, userRole }: { onLogout: () => void, userRole: string | null }) {
  return (
    <div className="min-h-screen bg-surface print:bg-white">
      <div className="print:hidden">
        <Sidebar onLogout={onLogout} userRole={userRole} />
      </div>
      <div className="ml-64 print:ml-0">
        <div className="print:hidden">
          <TopBar userRole={userRole} />
        </div>
        <main className="pt-16 print:pt-0 p-8 print:p-0 min-h-screen">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
