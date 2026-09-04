import React, { useState } from 'react';
import { Mail, Lock, LogIn } from 'lucide-react';

interface LoginViewProps {
  onLogin: (email: string, name: string) => void;
  onCancel?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLogin, onCancel }) => {
  const [email, setEmail] = useState('test@gmail.com');
  const [password, setPassword] = useState('password123');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const name = email.split('@')[0] || 'test';
    onLogin(email, name);
  };

  return (
    <div id="login-screen-wrapper" className="min-h-screen w-full bg-[#F5F5F7] flex items-center justify-center p-4">
      {/* Sign In Box */}
      <div 
        id="login-card"
        className="w-full max-w-md bg-white border border-[#E5E5E7] rounded-3xl p-10 shadow-sm flex flex-col items-center text-center space-y-6"
      >
        {/* Logo Badge */}
        <div className="w-12 h-12 rounded-2xl bg-[#0066FF] flex items-center justify-center text-white font-bold text-lg shadow-xs">
          <span>WB</span>
        </div>

        {/* Heading */}
        <div className="space-y-1">
          <h1 className="text-2xl font-bold text-[#1D1D1F] tracking-tight">Sign In</h1>
          <p className="text-xs text-[#86868B]">
            Enter your credentials to access the WasmBox sandbox
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
          {/* Email */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-email-input"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full bg-[#F5F5F7] focus:bg-white border border-[#E5E5E7] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:border-[#0066FF] font-sans transition-colors"
              />
            </div>
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label className="text-[11px] uppercase tracking-widest text-[#86868B] font-semibold">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-[#86868B] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="login-password-input"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#F5F5F7] focus:bg-white border border-[#E5E5E7] rounded-xl pl-9 pr-3 py-2.5 text-xs text-[#1D1D1F] placeholder:text-[#86868B] focus:outline-none focus:border-[#0066FF] font-sans transition-colors"
              />
            </div>
          </div>

          {/* Sign In Button */}
          <button
            id="login-submit-btn"
            type="submit"
            className="w-full mt-2 py-3 px-4 bg-[#0066FF] hover:bg-[#0052CC] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <LogIn className="w-4 h-4" />
            <span>Sign In</span>
          </button>
        </form>

        {/* Demo Mode Notice */}
        <p className="text-[11px] text-[#86868B]">
          Demo mode — any email/password works
        </p>
      </div>
    </div>
  );
};
