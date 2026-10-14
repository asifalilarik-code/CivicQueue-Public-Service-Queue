import React, { useState } from 'react';
import { UserPublic } from '../types/auth.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowRight,
  Sparkles,
  ShieldAlert,
  Volume2,
} from 'lucide-react';

interface AdminLoginViewProps {
  onLoginSuccess: (user: UserPublic) => void;
  onNavigateToUserAuth: () => void;
  onAdminLogin: (identifier: string, pass: string) => Promise<UserPublic>;
}

export const AdminLoginView: React.FC<AdminLoginViewProps> = ({
  onLoginSuccess,
  onNavigateToUserAuth,
  onAdminLogin,
}) => {
  const { language, t, isRtl, speak, isSpeaking, stopSpeaking } = useLanguage();
  const [adminId, setAdminId] = useState<string>('');
  const [adminPassword, setAdminPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!adminId.trim() || !adminPassword) {
      setErrorMsg(
        language === 'ur'
          ? 'براہ کرم ایڈمن ای میل اور پاس ورڈ درج کریں'
          : language === 'sd'
          ? 'مهرباني ڪري ايڊمن اي ميل ۽ پاس ورڊ لکو'
          : 'Please enter administrator email and password'
      );
      return;
    }

    try {
      setLoading(true);
      const user = await onAdminLogin(adminId.trim(), adminPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setErrorMsg(err.message || 'Administrator authentication failed. Access denied.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemoAdmin = () => {
    setAdminId('admin@civicqueue.gov');
    setAdminPassword('AdminPassword123!');
    setErrorMsg(null);
  };

  return (
    <div className="max-w-xl mx-auto py-10 sm:py-16 px-4 sm:px-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-slate-900 text-white rounded-3xl shadow-2xl border border-slate-800 overflow-hidden relative">
        <div className="h-2 w-full bg-gradient-to-r from-amber-500 via-indigo-500 to-emerald-500" />

        <div className="p-6 sm:p-10 space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto shadow-xl shadow-amber-500/10">
              <ShieldAlert className="w-8 h-8" />
            </div>
            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Restricted Access
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white mt-2">
                {t('adminPortalTitle')}
              </h1>
              <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-sm mx-auto">
                {t('adminPortalSubtitle')}
              </p>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-4 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-semibold flex items-center gap-3 animate-fadeIn">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('adminIdLabel')}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute ltr:left-4 rtl:right-4 top-3.5 text-slate-500" />
                <input
                  type="text"
                  value={adminId}
                  onChange={(e) => setAdminId(e.target.value)}
                  placeholder="admin@civicqueue.gov"
                  required
                  className="w-full ltr:pl-11 rtl:pr-11 px-4 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-slate-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                {t('password')}
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute ltr:left-4 rtl:right-4 top-3.5 text-slate-500" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                  className="w-full ltr:pl-11 rtl:pr-11 ltr:pr-11 rtl:pl-11 py-3.5 rounded-2xl border border-slate-700 bg-slate-800/80 text-white text-sm focus:outline-hidden focus:ring-2 focus:ring-amber-500 font-medium placeholder:text-slate-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute ltr:right-4 rtl:left-4 top-3.5 text-slate-500 hover:text-slate-300 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Autofill Demo Admin */}
            <div className="flex items-center justify-between text-xs pt-1">
              <button
                type="button"
                onClick={fillDemoAdmin}
                className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Autofill Demo Admin</span>
              </button>
              <span className="text-slate-500 font-mono text-[11px]">Role: Admin</span>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black text-sm rounded-2xl shadow-xl shadow-amber-500/20 transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Authenticating...' : t('adminSignInBtn')}</span>
              <ArrowRight className="w-4 h-4 rtl:rotate-180" />
            </button>
          </form>

          {/* Footer Back link */}
          <div className="pt-4 border-t border-slate-800 text-center">
            <button
              onClick={onNavigateToUserAuth}
              className="text-xs text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <strong className="text-indigo-400 underline">{t('citizenPortalTitle')}</strong>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
