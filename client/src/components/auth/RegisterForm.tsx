'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Lock, Mail, User, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { api } from '@/lib/api';

import { useAuth } from '@/context/AuthContext';

export function RegisterForm() {
  const router = useRouter();
  const { refreshAuth } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const passwordCriteria = {
    minLength: password.length >= 8,
    hasUppercase: /[A-Z]/.test(password),
    hasLowercase: /[a-z]/.test(password),
    hasNumber: /[0-9]/.test(password),
    hasSpecialChar: /[^A-Za-z0-9]/.test(password),
  };
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!isPasswordValid) {
      setError('Your password does not meet the strict security guidelines displayed below.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      await api.register({ name, email, password });
      await refreshAuth();
      router.push('/onboarding');
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };


  return (
    <Card className="p-6 bg-white shadow-soft rounded-2xl space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Full Name</label>
          <div className="relative">
            <User className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your Name"
              required
              className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-xs font-semibold text-slate-700">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Your Email"
              required
              className="w-full h-10 pl-9 pr-3 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your Password"
              required
              className="w-full h-10 pl-9 pr-10 text-sm rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:border-indigo-600 focus:outline-none transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>

          {/* Strict Password Guidelines Box */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs space-y-1.5">
            <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wider">
              Password Security Guidelines:
            </span>
            <ul className="space-y-1 text-[11px]">
              <li className={`flex items-center gap-2 font-medium ${passwordCriteria.minLength ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <span className="font-bold">{passwordCriteria.minLength ? '✓' : '•'}</span>
                <span>At least 8 characters long</span>
              </li>
              <li className={`flex items-center gap-2 font-medium ${passwordCriteria.hasUppercase ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <span className="font-bold">{passwordCriteria.hasUppercase ? '✓' : '•'}</span>
                <span>At least one uppercase letter (A-Z)</span>
              </li>
              <li className={`flex items-center gap-2 font-medium ${passwordCriteria.hasLowercase ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <span className="font-bold">{passwordCriteria.hasLowercase ? '✓' : '•'}</span>
                <span>At least one lowercase letter (a-z)</span>
              </li>
              <li className={`flex items-center gap-2 font-medium ${passwordCriteria.hasNumber ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <span className="font-bold">{passwordCriteria.hasNumber ? '✓' : '•'}</span>
                <span>At least one number (0-9)</span>
              </li>
              <li className={`flex items-center gap-2 font-medium ${passwordCriteria.hasSpecialChar ? 'text-emerald-600 font-bold' : 'text-slate-500'}`}>
                <span className="font-bold">{passwordCriteria.hasSpecialChar ? '✓' : '•'}</span>
                <span>At least one special character (!@#$%^&*)</span>
              </li>
            </ul>
          </div>
        </div>

        <Button type="submit" variant="ai" size="md" className="w-full font-bold gap-2" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating Account...
            </>
          ) : (
            <>
              Start Free Onboarding <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
        Already have an account?{' '}
        <Link href="/login" className="font-bold text-indigo-600 hover:underline">
          Sign In
        </Link>
      </div>
    </Card>
  );
}
