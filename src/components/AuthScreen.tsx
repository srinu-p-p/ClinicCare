import React, { useState } from 'react';
import { Lock, Mail, User, UserPlus, Stethoscope, ArrowRight, ShieldCheck, UserCheck } from 'lucide-react';
import { AuthResponse } from '../types';

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

  // Submit Handler
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

  // Quick Action Demo accounts
  const triggerDemo = (role: 'admin' | 'patient') => {
    setError(null);
    if (role === 'admin') {
      setIsLogin(true);
      setEmail('admin@clinic.com');
      setPassword('admin123');
    } else {
      // Setup a fast-access test patient account
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
