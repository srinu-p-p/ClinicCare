import React from 'react';
import { Stethoscope, LogOut, User, Activity } from 'lucide-react';
import { User as UserType } from '../types';

interface NavbarProps {
  user: UserType | null;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand */}
        <div className="flex items-center space-x-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white shadow-md shadow-teal-500/20">
            <Stethoscope className="h-5.5 w-5.5 animate-pulse" />
          </div>
          <div>
            <span className="text-lg font-bold tracking-tight text-slate-950">ClinicaCare</span>
            <span className="hidden ml-1.5 rounded-md bg-teal-50 px-2 py-0.5 text-xs font-semibold text-teal-700 sm:inline-block">
              V2.1 Smart Hub
            </span>
          </div>
        </div>

        {/* Portal status and User controls */}
        {user && (
          <div className="flex items-center space-x-6">
            <div className="hidden items-center space-x-4 md:flex">
              <span className="text-sm font-medium text-slate-500">
                Active Session:
              </span>
              <div className="flex items-center space-x-2 rounded-full bg-slate-100 px-3.5 py-1 text-xs font-semibold text-slate-800">
                <span className={`h-1.5 w-1.5 rounded-full ${user.role === 'admin' ? 'bg-indigo-600' : 'bg-teal-600 animate-pulse'}`} />
                <span className="capitalize">{user.role} Portal</span>
              </div>
            </div>

            {/* Profile pill */}
            <div className="flex items-center space-x-3 border-l border-slate-200 pl-4 md:pl-6">
              <div className="text-right">
                <p className="text-sm font-semibold text-slate-900 line-clamp-1">{user.name}</p>
                <p className="text-xs font-medium text-slate-400 line-clamp-1">{user.email}</p>
              </div>
              
              <button
                onClick={onLogout}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all hover:bg-rose-50 hover:text-rose-600 hover:border-rose-100 active:scale-95"
                title="Sign Out Account"
                id="btn-logout"
              >
                <LogOut className="h-4.5 w-4.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
