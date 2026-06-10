'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { api } from '../../../lib/api';
import { Mail, Lock, Eye, EyeOff, Loader2, Award, KeyRound, CheckCircle2, ArrowRight } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [devOtp, setDevOtp] = useState('');

  // Step 1: Request OTP
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    
    if (!email) {
      setErrorMsg('Please enter your corporate email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/forgot-password', { email });
      setSuccessMsg(response.data.message || 'OTP sent successfully.');
      if (response.data.devOtp) {
        setDevOtp(response.data.devOtp);
      }
      setStep(2);
    } catch (err: any) {
      console.error('OTP request failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to send OTP. Please try again.';
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!otp || !newPassword || !confirmPassword) {
      setErrorMsg('All fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email,
        otp,
        newPassword
      });
      setSuccessMsg(response.data.message || 'Password reset successful.');
      setStep(3); // success state
    } catch (err: any) {
      console.error('Password reset failed:', err);
      const errMsg = err.response?.data?.message || 'Failed to reset password. Please check the OTP.';
      setErrorMsg(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-radial from-[#1e1b4b] via-[#090514] to-[#020105] overflow-hidden px-4">
      {/* Decorative glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-purple-600/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-600/10 blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md z-10">
        
        {/* Branding Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-[0_0_20px_rgba(99,102,241,0.3)] mb-4">
            <Award className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Security & Recovery
          </h1>
          <p className="text-indigo-300/60 mt-1 font-medium text-xs">
            FWC IT Services Portal Password Reset
          </p>
        </div>

        {/* Card wrapper */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.4)]">
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-200 px-4 py-3 rounded-xl text-xs mb-5 animate-pulse">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: Enter Email */}
          {step === 1 && (
            <form onSubmit={handleRequestOtp} className="space-y-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">Forgot Password?</h2>
                <p className="text-indigo-200/50 text-xs mt-1">
                  Enter your registered corporate email address, and we will send a 6-digit OTP code to verify your identity.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-200/70 mb-2">
                  Corporate Email
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-300/40">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    placeholder="username@fwcit.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all duration-200"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Sending Code...
                  </>
                ) : (
                  <>
                    Request OTP Code <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* STEP 2: Enter OTP & New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="mb-4">
                <h2 className="text-lg font-bold text-white">Reset Credentials</h2>
                <p className="text-indigo-200/50 text-xs mt-1">
                  Enter the 6-digit verification code sent to {email} and choose a secure new password.
                </p>
              </div>

              {devOtp && (
                <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 text-center mb-3">
                  <span className="text-[10px] uppercase font-bold text-indigo-400 block mb-1">
                    Developer Mock OTP Code
                  </span>
                  <span className="text-base font-bold font-mono tracking-widest text-indigo-100">
                    {devOtp}
                  </span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-indigo-200/70 mb-2">
                  6-Digit OTP Code
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-indigo-300/40">
                    <KeyRound className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-3 pl-11 pr-4 text-sm text-white placeholder-indigo-200/20 focus:outline-none tracking-widest text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-indigo-200/70 mb-2">
                    New Password
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-indigo-200/70 mb-2">
                    Confirm
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="Confirm"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isLoading}
                    className="w-full bg-white/[0.03] border border-white/[0.08] focus:border-indigo-500 rounded-xl py-2.5 px-3.5 text-xs text-white placeholder-indigo-200/20 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-between items-center">
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="text-[10px] font-bold text-indigo-300/60 hover:text-white flex items-center transition-colors"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5 mr-1" /> : <Eye className="h-3.5 w-3.5 mr-1" />}
                  {showPassword ? 'Hide Passwords' : 'Reveal Passwords'}
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Resetting Password...
                  </>
                ) : (
                  'Confirm Password Reset'
                )}
              </button>
            </form>
          )}

          {/* STEP 3: Success Screen */}
          {step === 3 && (
            <div className="text-center space-y-5 py-4 animate-fade-in">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-green-500/10 border border-green-500/20 text-green-400">
                <CheckCircle2 className="h-10 w-10" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Password Updated!</h2>
                <p className="text-indigo-200/50 text-xs mt-1">
                  Your credentials have been successfully updated. You can now log in with your new password.
                </p>
              </div>
              <Link
                href="/login"
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm py-3 px-4 rounded-xl shadow-lg transition-all flex items-center justify-center"
              >
                Login to Portal
              </Link>
            </div>
          )}

          {/* Link back to login */}
          {step < 3 && (
            <div className="mt-6 text-center text-xs font-medium text-indigo-200/40">
              Go back to{' '}
              <Link
                href="/login"
                className="text-indigo-400 font-semibold hover:text-indigo-300 transition-colors"
              >
                Sign In
              </Link>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
