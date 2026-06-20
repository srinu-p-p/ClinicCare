import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import AuthScreen from './components/AuthScreen';
import PatientPortal from './components/PatientPortal';
import AdminPortal from './components/AdminPortal';
import { AuthResponse } from './types';
import { RefreshCw } from 'lucide-react';

export default function App() {
  const [auth, setAuth] = useState<AuthResponse | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);

  // Load persistent user login session on mount
  useEffect(() => {
    const storedAuth = localStorage.getItem('clinica_auth');
    if (storedAuth) {
      try {
        const parsed = JSON.parse(storedAuth);
        
        // Verify token with backend
        fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${parsed.token}` }
        })
        .then(res => {
          if (res.ok) {
            setAuth(parsed);
          } else {
            // Token expired or invalid, drop it
            localStorage.removeItem('clinica_auth');
          }
        })
        .catch(err => {
          console.error('Session validation error:', err);
          // Fallback to offline load in case of transient error
          setAuth(parsed);
        })
        .finally(() => {
          setInitialLoading(false);
        });
        
        return;
      } catch (e) {
        localStorage.removeItem('clinica_auth');
      }
    }
    setInitialLoading(false);
  }, []);

  // Handle successful login or registration
  const handleAuthSuccess = (newAuth: AuthResponse) => {
    setAuth(newAuth);
    localStorage.setItem('clinica_auth', JSON.stringify(newAuth));
  };

  // Sign out user session
  const handleLogout = () => {
    setAuth(null);
    localStorage.removeItem('clinica_auth');
  };

  // Render initial loader while validating session token
  if (initialLoading) {
    return (
      <div className="flex h-screen w-screen flex-col items-center justify-center bg-slate-50 space-y-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-xl shadow-teal-500/10">
          <RefreshCw className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-sm font-semibold text-slate-500 font-mono">Restoring ClinicaCare Session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Dynamic Navigation Bar (shows session details if auth is active) */}
      <Navbar user={auth ? auth.user : null} onLogout={handleLogout} />

      {/* Main core layout router */}
      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {auth ? (
            /* User Role Routing Panel */
            auth.user.role === 'admin' ? (
              <AdminPortal auth={auth} />
            ) : (
              <PatientPortal auth={auth} />
            )
          ) : (
            /* Authentications form console */
            <AuthScreen onAuthSuccess={handleAuthSuccess} />
          )}
        </div>
      </main>

      {/* Hospital Credentials footer */}
      <footer className="border-t border-slate-200 bg-white py-6 mt-16">
        <div className="mx-auto max-w-7xl px-4 text-center sm:px-6 lg:px-8">
          <p className="text-xs font-semibold text-slate-400 capitalize">
            &copy; {new Date().getFullYear()} ClinicaCare System Hub. All administrative logs secured in local storage.
          </p>
        </div>
      </footer>
    </div>
  );
}
