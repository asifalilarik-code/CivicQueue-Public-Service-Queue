import React, { useState } from 'react';
import { UserPublic } from '../types/auth.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  validateCNIC,
  validatePhone,
  validateEmail,
  validatePassword,
  formatCNICInput,
  formatPhoneInput,
} from '../utils/security.ts';
import {
  User,
  Lock,
  Mail,
  Phone,
  CreditCard,
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  ShieldAlert,
  Building2,
  FileCheck,
  Volume2,
} from 'lucide-react';

interface UserAuthViewProps {
  onLoginSuccess: (user: UserPublic) => void;
  onNavigateToAdmin: () => void;
  onLogin: (identifier: string, pass: string) => Promise<UserPublic>;
  onRegister: (formData: {
    fullName: string;
    cnic: string;
    mobile: string;
    email: string;
    password: string;
    city?: string;
    address?: string;
  }) => Promise<UserPublic>;
}

export const UserAuthView: React.FC<UserAuthViewProps> = ({
  onLoginSuccess,
  onNavigateToAdmin,
  onLogin,
  onRegister,
}) => {
  const { language, t, isRtl, speak, isSpeaking, stopSpeaking } = useLanguage();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Login form state
  const [loginId, setLoginId] = useState<string>('');
  const [loginPassword, setLoginPassword] = useState<string>('');
  const [showLoginPassword, setShowLoginPassword] = useState<boolean>(false);
  const [loginLoading, setLoginLoading] = useState<boolean>(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Registration form state
  const [regFullName, setRegFullName] = useState<string>('');
  const [regCnic, setRegCnic] = useState<string>('');
  const [regMobile, setRegMobile] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [regCity, setRegCity] = useState<string>('Islamabad');
  const [regAddress, setRegAddress] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [regLoading, setRegLoading] = useState<boolean>(false);
  const [regError, setRegError] = useState<string | null>(null);

  // Live validation feedback
  const cnicValidation = validateCNIC(regCnic);
  const phoneValidation = validatePhone(regMobile);
  const emailValidation = validateEmail(regEmail);
  const passwordValidation = validatePassword(regPassword);

  // Handle Citizen Login
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);

    if (!loginId.trim() || !loginPassword) {
      setLoginError('Please enter your Email, CNIC, or Mobile and your password.');
      return;
    }

    try {
      setLoginLoading(true);
      const user = await onLogin(loginId.trim(), loginPassword);
      onLoginSuccess(user);
    } catch (err: any) {
      setLoginError(err.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Citizen Registration
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    if (!regFullName.trim()) {
      setRegError('Please enter your full official name');
      return;
    }

    if (!cnicValidation.valid) {
      setRegError(cnicValidation.error || 'Please enter a valid 13-digit CNIC number');
      return;
    }

    if (!phoneValidation.valid) {
      setRegError(phoneValidation.error || 'Please enter a valid mobile number');
      return;
    }

    if (!emailValidation.valid) {
      setRegError(emailValidation.error || 'Please enter a valid email address');
      return;
    }

    if (!passwordValidation.valid) {
      setRegError(passwordValidation.error || 'Password must be at least 6 characters');
      return;
    }

    if (regPassword !== regConfirmPassword) {
      setRegError('Password and confirmation password do not match');
      return;
    }

    try {
      setRegLoading(true);
      const user = await onRegister({
        fullName: regFullName.trim(),
        cnic: cnicValidation.formatted,
        mobile: phoneValidation.formatted,
        email: regEmail.trim(),
        password: regPassword,
        city: regCity,
        address: regAddress.trim(),
      });
      onLoginSuccess(user);
    } catch (err: any) {
      setRegError(err.message || 'Registration failed. Please review your details.');
    } finally {
      setRegLoading(false);
    }
  };

  // Demo autofill helpers
  const fillDemoCitizen = (type: 'ahmed' | 'fatima') => {
    if (type === 'ahmed') {
      setLoginId('citizen@civicqueue.gov');
      setLoginPassword('Citizen123!');
    } else {
      setLoginId('fatima.noor@civicqueue.gov');
      setLoginPassword('Citizen123!');
    }
    setLoginError(null);
  };

  return (
    <div className="max-w-xl mx-auto py-8 sm:py-12 px-4 sm:px-6">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-blue-600 p-6 sm:p-8 text-white relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/20">
                <Building2 className="w-5 h-5 text-indigo-100" />
              </div>
              <div>
                <span className="text-[11px] font-black tracking-widest uppercase text-indigo-200">
                  {t('tabCitizenPortal')}
                </span>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
                  {t('citizenPortalTitle')}
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (isSpeaking) {
                    stopSpeaking();
                  } else {
                    if (language === 'ur') {
                      speak('شہری پورٹل میں خوش آمدید۔ لاگ ان کرنے کے لیے اپنا ای میل یا شناختی کارڈ اور پاس ورڈ درج کریں۔ نیا اکاؤنٹ بنانے کے لیے رجسٹر کا بٹن دبائیں۔');
                    } else if (language === 'sd') {
                      speak('شهري پورٽل ۾ ڀلي ڪري آيا. لاگ ان ٿيڻ لاءِ پنهنجو شناختي ڪارڊ يا اي ميل ۽ پاس ورڊ لکو. نئون اڪائونٽ ٺاهڻ لاءِ رجسٽر تي ڪلڪ ڪريو.');
                    } else {
                      speak('Welcome to the citizen portal. Sign in with your CNIC or create a new account.');
                    }
                  }
                }}
                className={`p-2 rounded-xl border border-white/20 transition-all ${
                  isSpeaking ? 'bg-rose-500 text-white animate-pulse' : 'bg-white/10 hover:bg-white/20 text-amber-300'
                }`}
                title={t('listenVoice')}
              >
                <Volume2 className="w-4 h-4" />
              </button>

              <button
                onClick={onNavigateToAdmin}
                className="text-[11px] font-bold bg-white/10 hover:bg-white/20 text-indigo-100 hover:text-white px-3 py-1.5 rounded-xl border border-white/20 transition-all flex items-center gap-1.5 cursor-pointer shrink-0"
                title="Official Administrator Portal"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-amber-300" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            </div>
          </div>

          <p className="text-xs text-indigo-100 max-w-md">
            {t('citizenPortalSubtitle')}
          </p>

          {/* Mode Tabs */}
          <div className="mt-6 flex bg-indigo-900/40 p-1 rounded-2xl border border-white/15">
            <button
              type="button"
              onClick={() => {
                setAuthMode('login');
                setLoginError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              {t('signInTab')}
            </button>
            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setRegError(null);
              }}
              className={`flex-1 py-2.5 text-xs font-black rounded-xl transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-white text-indigo-900 shadow-md'
                  : 'text-indigo-100 hover:text-white hover:bg-white/10'
              }`}
            >
              {t('registerTab')}
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8">
          {/* SIGN IN FORM */}
          {authMode === 'login' && (
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              {loginError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{loginError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Email, CNIC Number, or Mobile Phone
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={loginId}
                    onChange={(e) => setLoginId(e.target.value)}
                    placeholder="citizen@civicqueue.gov or 42101-8765432-1"
                    required
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5">
                  You can sign in using your registered email address, 13-digit CNIC, or mobile number.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                  Security Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type={showLoginPassword ? 'text' : 'password'}
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••••••••"
                    required
                    className="w-full pl-11 pr-11 py-3.5 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Demo Citizen Autofill Shortcuts */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                <div className="text-[11px] font-bold text-slate-600 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  Quick Demo Citizen Accounts:
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => fillDemoCitizen('ahmed')}
                    className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                  >
                    Demo 1: Ahmed Raza (Karachi)
                  </button>
                  <button
                    type="button"
                    onClick={() => fillDemoCitizen('fatima')}
                    className="text-xs font-semibold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
                  >
                    Demo 2: Fatima Noor (Lahore)
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-indigo-600/25 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {loginLoading ? 'Authenticating...' : 'Sign In to Citizen Dashboard'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* REGISTRATION FORM */}
          {authMode === 'register' && (
            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              {regError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-500" />
                  <span>{regError}</span>
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                  Full Official Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="e.g. Muhammad Asif Khan"
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* CNIC Number */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                    National CNIC Number <span className="text-rose-500">*</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">
                    Format: XXXXX-XXXXXXX-X
                  </span>
                </div>
                <div className="relative">
                  <CreditCard className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={regCnic}
                    onChange={(e) => setRegCnic(formatCNICInput(e.target.value))}
                    maxLength={15}
                    placeholder="42101-1234567-1"
                    required
                    className={`w-full pl-11 pr-10 py-3 rounded-2xl border text-slate-900 text-sm focus:outline-hidden focus:ring-2 font-mono font-medium placeholder:text-slate-400 ${
                      regCnic && cnicValidation.valid
                        ? 'border-emerald-500 focus:ring-emerald-500 bg-emerald-50/20'
                        : regCnic && !cnicValidation.valid
                        ? 'border-rose-300 focus:ring-rose-500 bg-rose-50/20'
                        : 'border-slate-300 focus:ring-indigo-600'
                    }`}
                  />
                  {regCnic && (
                    <div className="absolute right-3.5 top-3.5">
                      {cnicValidation.valid ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                      )}
                    </div>
                  )}
                </div>
                {regCnic && !cnicValidation.valid && (
                  <p className="text-[11px] text-rose-600 mt-1">{cnicValidation.error}</p>
                )}
              </div>

              {/* Mobile Phone & Email in 2 columns */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Mobile Phone */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={regMobile}
                      onChange={(e) => setRegMobile(formatPhoneInput(e.target.value))}
                      placeholder="0300-1234567"
                      required
                      className="w-full pl-11 pr-3 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-mono font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="citizen@domain.com"
                      required
                      className="w-full pl-11 pr-3 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Password & Confirm Password */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Min 6 characters"
                      required
                      className="w-full pl-11 pr-10 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Re-type password"
                      required
                      className="w-full pl-11 pr-3 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Password Strength Indicator */}
              {regPassword && (
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 text-[11px]">Strength:</span>
                  <div className="flex gap-1 flex-1">
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        passwordValidation.strength === 'weak'
                          ? 'bg-amber-400'
                          : 'bg-emerald-500'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        passwordValidation.strength === 'medium' ||
                        passwordValidation.strength === 'strong'
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                    <div
                      className={`h-1.5 flex-1 rounded-full ${
                        passwordValidation.strength === 'strong'
                          ? 'bg-emerald-500'
                          : 'bg-slate-200'
                      }`}
                    />
                  </div>
                  <span
                    className={`font-bold capitalize text-[11px] ${
                      passwordValidation.strength === 'weak'
                        ? 'text-amber-600'
                        : 'text-emerald-600'
                    }`}
                  >
                    {passwordValidation.strength}
                  </span>
                </div>
              )}

              {/* City and Address */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    City / District
                  </label>
                  <select
                    value={regCity}
                    onChange={(e) => setRegCity(e.target.value)}
                    className="w-full px-3 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium bg-white cursor-pointer"
                  >
                    <option value="Islamabad">Islamabad</option>
                    <option value="Rawalpindi">Rawalpindi</option>
                    <option value="Lahore">Lahore</option>
                    <option value="Karachi">Karachi</option>
                    <option value="Peshawar">Peshawar</option>
                    <option value="Quetta">Quetta</option>
                    <option value="Faisalabad">Faisalabad</option>
                    <option value="Multan">Multan</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                    Street Address / Area (Optional)
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 absolute left-4 top-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={regAddress}
                      onChange={(e) => setRegAddress(e.target.value)}
                      placeholder="e.g. Sector F-7/2, Street 14"
                      className="w-full pl-11 pr-3 py-3 rounded-2xl border border-slate-300 text-slate-900 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600 font-medium placeholder:text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Security Privacy Reassurance */}
              <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-indigo-50/70 border border-indigo-100 text-[11px] text-indigo-900">
                <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                <span>
                  <strong>National Privacy Assurance:</strong> Your CNIC and mobile number are securely salted and stored. Public display boards only reveal masked identifiers (e.g., <code>42101-*******-1</code>).
                </span>
              </div>

              {/* Register Button */}
              <button
                type="submit"
                disabled={regLoading}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 mt-2"
              >
                {regLoading ? 'Creating Profile...' : 'Complete Citizen Registration'}
                <FileCheck className="w-4 h-4" />
              </button>
            </form>
          )}

          {/* Footer Switching Option */}
          <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div>
              {authMode === 'login' ? (
                <span>
                  New citizen?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('register');
                      setRegError(null);
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Register an account
                  </button>
                </span>
              ) : (
                <span>
                  Already registered?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthMode('login');
                      setLoginError(null);
                    }}
                    className="font-bold text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                  >
                    Sign in here
                  </button>
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onNavigateToAdmin}
              className="text-amber-700 hover:text-amber-800 font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600" />
              Officer / Admin Login Portal &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
