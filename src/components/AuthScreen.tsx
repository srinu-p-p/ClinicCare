import React, { useState } from 'react';
import { Lock, Mail, User, Stethoscope, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { AuthResponse } from '../types';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase.ts';

interface AuthScreenProps {
  onAuthSuccess: (auth: AuthResponse) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Email/Password Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const url = isLogin ? '/api/auth/login' : '/api/auth/register';
    const payload = isLogin ? { email, password } : { name, email, password };

    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Authentication process failed.');
      }

      onAuthSuccess(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Google Sign-In Handler via Firebase Auth
  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await signInWithPopup(auth, googleAuthProvider);
      const idToken = await result.user.getIdToken();

      const res = await fetch('/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Google authentication backend verification failed.');
      }

      onAuthSuccess(data);
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      // Friendly messaging if popup blocked or closed
      setError(err.message || 'Google login was aborted. If using an iframe, please try opening in a new tab.');
    } finally {
      setLoading(false);
    }
  };

  // Quick Action Demo accounts
  const triggerDemo = (role: 'admin' | 'patient') => {
    setError(null);
    if (role === 'admin') {
      setIsLogin(true);
      setEmail('admin@clinic.com');
      setPassword('admin123');
    } else {
      setIsLogin(false);
      setName('Alex Mercer');
      setEmail('alex@example.com');
      setPassword('alex123');
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12 sm:px-6 lg:px-8 bg-slate-50">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-100/50 animate-fade-in" id="auth-card">
        
        {/* Branding header */}
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-teal-600 text-white shadow-lg shadow-teal-500/20">
            <Stethoscope className="h-6 w-6" />
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950">
            {isLogin ? 'Sign in to ClinicaCare' : 'Create Patient Account'}
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            {isLogin ? 'Manage appointments, schedules & medical profiles' : 'Register today to book slot appointments instantly'}
          </p>
        </div>

        {/* Tab Controls */}
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`rounded-md py-2 text-sm font-semibold transition-all ${
              isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-950'
            }`}
            id="tab-login"
          >
            Login
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`rounded-md py-2 text-sm font-semibold transition-all ${
              !isLogin ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-950'
            }`}
            id="tab-register"
          >
            Register
          </button>
        </div>

        {/* Action Error Alerts */}
        {error && (
          <div className="rounded-lg border border-red-100 bg-red-50 p-4 text-sm font-medium text-red-600" id="auth-error-alert">
            {error}
          </div>
        )}

        {/* Form elements */}
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {!isLogin && (
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Full Name</label>
              <div className="relative mt-1">
                <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <User className="h-4.5 w-4.5" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Mercer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-950 placeholder-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2.5 focus:ring-teal-100"
                  id="input-name"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Email Address</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Mail className="h-4.5 w-4.5" />
              </div>
              <input
                type="email"
                required
                placeholder="e.g. alex@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-950 placeholder-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2.5 focus:ring-teal-100"
                id="input-email"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-600">Password</label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                <Lock className="h-4.5 w-4.5" />
              </div>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-950 placeholder-slate-400 transition-all focus:border-teal-500 focus:bg-white focus:outline-none focus:ring-2.5 focus:ring-teal-100"
                id="input-password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center rounded-lg bg-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-teal-600/10 transition-all hover:bg-teal-700 hover:shadow-teal-650/20 active:scale-99 disabled:opacity-50"
            id="btn-auth-submit"
          >
            {loading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <span className="flex items-center space-x-2">
                <span>{isLogin ? 'Sign In' : 'Create Account'}</span>
                <ArrowRight className="h-4 w-4" />
              </span>
            )}
          </button>
        </form>

        {/* Secure Cloud login options */}
        <div className="relative mt-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200"></div>
          </div>
          <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
            <span className="bg-white px-3 text-slate-400">Or continue with</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="flex w-full items-center justify-center space-x-2.5 rounded-lg border border-slate-200 bg-white py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 active:scale-99 disabled:opacity-50"
          id="btn-google-signin"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335"/>
          </svg>
          <span>Sign up / Log in with Google</span>
        </button>

        {/* Demo Fast Access Pill Section */}
        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs font-semibold uppercase tracking-wider">
            <span className="bg-white px-3 text-slate-400">Quick Access Developer Credentials</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mt-4">
          <button
            onClick={() => triggerDemo('admin')}
            className="flex items-center justify-center space-x-2 rounded-lg border border-indigo-200 bg-indigo-50/50 py-2.5 px-3 text-xs font-semibold text-indigo-700 transition-all hover:bg-indigo-100 hover:border-indigo-300"
            title="Pre-fill Admin demo info"
            type="button"
            id="btn-demo-admin"
          >
            <ShieldCheck className="h-4 w-4" />
            <div className="text-left">
              <div className="leading-tight">Admin Demo</div>
              <div className="text-[10px] font-normal text-slate-450 leading-tight">Admin Portal</div>
            </div>
          </button>

          <button
            onClick={() => triggerDemo('patient')}
            className="flex items-center justify-center space-x-2 rounded-lg border border-teal-200 bg-teal-50/50 py-2.5 px-3 text-xs font-semibold text-teal-700 transition-all hover:bg-teal-100 hover:border-teal-300"
            title="Pre-fill Patient demo info"
            type="button"
            id="btn-demo-patient"
          >
            <UserCheck className="h-4 w-4" />
            <div className="text-left">
              <div className="leading-tight">Patient Demo</div>
              <div className="text-[10px] font-normal text-slate-450 leading-tight">Patient Portal</div>
            </div>
          </button>
        </div>

      </div>
    </div>
  );
}
