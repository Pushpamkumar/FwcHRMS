'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/useAuthStore';
import { Lock, Mail, Eye, EyeOff, Loader2, Award } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, isAuthenticated, user, isLoading, initializeAuth } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Countdown timer for rate-limit lockout
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setErrorMsg('');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Run silent auth initialization check on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // If already authenticated, redirect to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      const redirectPath = searchParams.get('redirect') || getRoleHomePath(user.role);
      router.push(redirectPath);
    }
  }, [isAuthenticated, user, router, searchParams]);

  const getRoleHomePath = (role: string): string => {
    switch (role) {
      case 'admin':
        return '/admin';
      case 'manager':
        return '/manager';
      case 'hr_recruiter':
        return '/recruiter';
      case 'candidate':
        return '/candidate';
      case 'employee':
      default:
        return '/employee';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!email || !password) {
      setErrorMsg('Please enter both email and password.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    try {
      await login({ email, password });
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.response?.status === 429) {
        const retryAfter = err.response?.data?.retryAfter || 60;
        setCountdown(retryAfter);
        setErrorMsg(`Rate limited`);
      } else {
        const errMsg = err.response?.data?.message || 'Login failed. Please check your credentials.';
        setErrorMsg(errMsg);
      }
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-radial from-[#1e1b4b] via-[#090514] to-[#020105] overflow-hidden px-4">
      {/* Decorative gradient glowing spheres */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        
        {/* Brand Header */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-4">
            <Award className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white via-indigo-200 to-purple-300 tracking-tight">
            FWC IT Services
          </h1>
          <p className="text-indigo-300/60 mt-1 font-medium text-sm">
            Next-Generation HR Management System
          </p>
        </div>

        {/* Glassmorphic Login Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)] transition-all duration-300 hover:border-white/[0.12] hover:shadow-[0_20px_50px_rgba(99,102,241,0.05)]">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-white">Welcome Back</h2>
            <p className="text-indigo-200/50 text-xs mt-1">
              Sign in with your enterprise credentials to access your portal.
            </p>
          </div>

          {countdown > 0 ? (
            <div className="bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl text-xs mb-5 flex items-center space-x-3">
              <div className="shrink-0 relative h-10 w-10">
                <svg className="h-10 w-10 -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="rgba(239,68,68,0.15)" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke="rgba(239,68,68,0.7)" strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 15.5}`}
                    strokeDashoffset={`${2 * Math.PI * 15.5 * (1 - countdown / 60)}`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 1s linear' }}
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-extrabold text-red-400 font-mono">
                  {countdown}
                </span>
              </div>
              <div>
                <p className="text-red-200 font-semibold">Too many login attempts</p>
                <p className="text-red-200/60 mt-0.5">Wait <span className="font-bold text-red-300">{countdown}s</span> before trying again</p>
              </div>
            </div>
          ) : errorMsg ? (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-xs mb-5 animate-pulse">
              {errorMsg}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-5" autoComplete="off">
            {/* Email Input */}
            <div>
              <label className="block text-xs font-semibold text-indigo-200/70 mb-2">
                Corporate Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-300/40">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  required
                  autoComplete="username"
                  placeholder="name@fwcit.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-xs font-semibold text-indigo-200/70">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors duration-150"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-300/40">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-3 pl-11 pr-11 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-indigo-300/40 hover:text-white transition-colors duration-150"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center justify-between pt-1">
              <label className="flex items-center space-x-2 text-xs font-semibold text-indigo-200/50 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded border-white/[0.08] bg-white/[0.03] text-indigo-600 focus:ring-0 focus:ring-offset-0 focus:outline-none w-4 h-4 cursor-pointer"
                />
                <span>Remember this device</span>
              </label>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || countdown > 0}
              className="w-full bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-[0_4px_20px_rgba(99,102,241,0.25)] transition-all duration-150 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 focus:ring-offset-[#020105] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {countdown > 0 ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Retry in {countdown}s...
                </>
              ) : isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Verifying Credentials...
                </>
              ) : (
                'Sign In to Portal'
              )}
            </button>
          </form>

          {/* Registration Redirect */}
          <div className="mt-6 text-center text-xs font-medium text-indigo-200/40">
            Don't have an account yet?{' '}
            <Link
              href="/register"
              className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors duration-150"
            >
              Onboard here
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-8 text-center text-[10px] text-indigo-200/20 font-medium">
          FWC HRMS v1.0 • Secure HTTPS Session Endpoints
        </div>

      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#090514]">
        <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
