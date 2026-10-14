import React, { useState, useEffect } from 'react';
import { UserPublic } from '../types/auth.ts';
import { Token, ServiceCategoryId } from '../types/queue.ts';
import { SERVICE_CATEGORIES } from '../services/queueStore.ts';
import { formatWaitTime } from '../services/calculator.ts';
import { maskCNIC, maskPhone, validatePhone } from '../utils/security.ts';
import { useLanguage } from '../context/LanguageContext.tsx';
import {
  User,
  CreditCard,
  Phone,
  Mail,
  MapPin,
  Calendar,
  ShieldCheck,
  Clock,
  Ticket,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Edit3,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  FileCheck,
  Award,
  HeartHandshake,
  Layers,
  Volume2,
} from 'lucide-react';

interface UserDashboardViewProps {
  user: UserPublic;
  onLogout: () => void;
  onNavigateToTracker: (tokenNumber?: string) => void;
  onIssueToken: (serviceType: ServiceCategoryId, name?: string, isPri?: boolean) => Promise<any>;
  onRegisterToken: (tokenNumber: string) => void;
}

export const UserDashboardView: React.FC<UserDashboardViewProps> = ({
  user,
  onLogout,
  onNavigateToTracker,
  onIssueToken,
  onRegisterToken,
}) => {
  const { language, t, isRtl, speak, isSpeaking, stopSpeaking } = useLanguage();
  const [showFullCnic, setShowFullCnic] = useState<boolean>(false);
  const [activeTickets, setActiveTickets] = useState<Token[]>([]);
  const [completedTickets, setCompletedTickets] = useState<Token[]>([]);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);
  const [bookingCategory, setBookingCategory] = useState<ServiceCategoryId>('GEN');
  const [bookingPriority, setBookingPriority] = useState<boolean>(false);
  const [isBooking, setIsBooking] = useState<boolean>(false);
  const [bookingMsg, setBookingMsg] = useState<string | null>(null);

  // Edit profile state
  const [showEditModal, setShowEditModal] = useState<boolean>(false);
  const [editPhone, setEditPhone] = useState<string>(user.mobile);
  const [editCity, setEditCity] = useState<string>(user.city || 'Islamabad');
  const [editAddress, setEditAddress] = useState<string>(user.address || '');
  const [editLoading, setEditLoading] = useState<boolean>(false);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch user tickets
  const fetchDashboardData = async () => {
    try {
      setLoadingTickets(true);
      const token = localStorage.getItem('civic_auth_token');
      const res = await fetch('/api/user/dashboard', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setActiveTickets(data.activeTickets || []);
        setCompletedTickets(data.completedTickets || []);
      }
    } catch (err) {
      console.warn('Error fetching dashboard:', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user.id]);

  const handleBookTicket = async () => {
    try {
      setIsBooking(true);
      setBookingMsg(null);
      const res = await onIssueToken(bookingCategory, user.fullName, bookingPriority);
      if (res && res.token) {
        onRegisterToken(res.token.tokenNumber);
        setShowBookingModal(false);
        fetchDashboardData();
        onNavigateToTracker(res.token.tokenNumber);
      }
    } catch (err: any) {
      setBookingMsg(err.message || 'Booking failed');
    } finally {
      setIsBooking(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setEditError(null);
    const phoneVal = validatePhone(editPhone);
    if (!phoneVal.isValid) {
      setEditError(phoneVal.error || 'Invalid phone format');
      return;
    }

    try {
      setEditLoading(true);
      const token = localStorage.getItem('civic_auth_token');
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          mobile: phoneVal.normalized,
          city: editCity,
          address: editAddress,
        }),
      });
      if (res.ok) {
        user.mobile = phoneVal.normalized;
        user.city = editCity;
        user.address = editAddress;
        setShowEditModal(false);
      } else {
        const d = await res.json();
        setEditError(d.error || 'Failed to update');
      }
    } catch (err: any) {
      setEditError(err.message || 'Update error');
    } finally {
      setEditLoading(false);
    }
  };

  const getCategoryIcon = (id: ServiceCategoryId) => {
    switch (id) {
      case 'GEN':
        return <HelpCircle className="w-4 h-4 text-blue-500" />;
      case 'DOC':
        return <FileCheck className="w-4 h-4 text-indigo-500" />;
      case 'CSH':
        return <CreditCard className="w-4 h-4 text-emerald-500" />;
      case 'LIC':
        return <Award className="w-4 h-4 text-amber-500" />;
      case 'PRI':
        return <HeartHandshake className="w-4 h-4 text-purple-500" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner / Citizen Identity Card */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-3xl bg-indigo-600/30 border border-indigo-400/40 text-indigo-300 flex items-center justify-center font-black text-2xl shadow-xl">
            {user.fullName.charAt(0)}
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{user.fullName}</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                {language === 'sd' ? 'تصديق ٿيل شهري' : language === 'ur' ? 'تصدیق شدہ شہری' : 'Verified Citizen'}
              </span>
            </div>
            <p className="text-xs text-slate-300">
              {t('userDashboardHeading')} • {user.email}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowBookingModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4" />
            <span>{t('printSlipBtn')}</span>
          </button>
          <button
            onClick={() => setShowEditModal(true)}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-500/30"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>{t('signOut')}</span>
          </button>
        </div>
      </div>

      {/* Citizen Personal Information Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* CNIC Card */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
            <span className="flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-indigo-500" />
              National CNIC
            </span>
            <button
              onClick={() => setShowFullCnic(!showFullCnic)}
              className="text-slate-400 hover:text-indigo-600 cursor-pointer"
              title={showFullCnic ? 'Mask CNIC' : 'Reveal full CNIC'}
            >
              {showFullCnic ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            </button>
          </div>
          <div className="text-xl font-mono font-black text-slate-900 pt-1">
            {showFullCnic ? user.cnic : maskCNIC(user.cnic)}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">13-digit verified citizen identification</p>
        </div>

        {/* Mobile Phone */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Phone className="w-4 h-4 text-emerald-500" />
            Mobile Phone
          </span>
          <div className="text-xl font-mono font-black text-slate-900 pt-1">
            {user.mobile}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">SMS dispatch notifications enabled</p>
        </div>

        {/* Email Address */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <Mail className="w-4 h-4 text-blue-500" />
            Email Address
          </span>
          <div className="text-sm font-bold text-slate-900 pt-2 truncate" title={user.email}>
            {user.email}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Primary digital notification inbox</p>
        </div>

        {/* City & Domicile */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/90 shadow-2xs space-y-1">
          <span className="flex items-center gap-1.5 text-slate-400 text-xs font-bold uppercase tracking-wider">
            <MapPin className="w-4 h-4 text-amber-500" />
            Domicile District
          </span>
          <div className="text-base font-bold text-slate-900 pt-1">
            {user.city || 'Islamabad'}
          </div>
          <p className="text-[10px] text-slate-400 font-medium">Registered Civic Services Center</p>
        </div>
      </div>

      {/* Active Queue Ticket (If any) */}
      {activeTickets.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              Active Queue Ticket
            </h2>
            <span className="text-xs text-slate-500 font-semibold">Live status</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTickets.map((tok) => {
              const cat = SERVICE_CATEGORIES[tok.serviceType] || SERVICE_CATEGORIES.GEN;
              const isServing = tok.status === 'SERVING';

              return (
                <div
                  key={tok.id}
                  className={`p-6 rounded-3xl border shadow-sm flex items-center justify-between gap-4 ${
                    isServing
                      ? 'bg-emerald-50/70 border-emerald-300'
                      : 'bg-white border-indigo-200'
                  }`}
                >
                  <div className="space-y-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        isServing ? 'bg-emerald-200 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                      }`}
                    >
                      {tok.status}
                    </span>
                    <div className="text-4xl font-black font-mono text-slate-950 pt-1">
                      {tok.tokenNumber}
                    </div>
                    <p className="text-xs font-semibold text-slate-600">{cat.name}</p>
                    {tok.servingCounterName && (
                      <p className="text-xs font-bold text-emerald-700">
                        Proceed to {tok.servingCounterName}
                      </p>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      onRegisterToken(tok.tokenNumber);
                      onNavigateToTracker(tok.tokenNumber);
                    }}
                    className="px-5 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
                  >
                    Open Live Screen
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Ticket History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-2xs">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Ticket className="w-5 h-5 text-indigo-600" />
              Citizen Ticket Visit History
            </h2>
            <p className="text-xs text-slate-500">
              Audit record of past visits and service counter interactions
            </p>
          </div>
          <span className="text-xs font-bold px-3 py-1 bg-slate-100 text-slate-700 rounded-full">
            {completedTickets.length} past records
          </span>
        </div>

        {completedTickets.length === 0 ? (
          <div className="py-12 text-center text-slate-400 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
            <p className="text-sm font-bold text-slate-600">No completed visits yet</p>
            <p className="text-xs">Your completed queue visits will automatically archive here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-bold">Token ID</th>
                  <th className="pb-3 font-bold">Service Category</th>
                  <th className="pb-3 font-bold">Date & Time</th>
                  <th className="pb-3 font-bold">Station</th>
                  <th className="pb-3 font-bold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedTickets.map((t) => {
                  const cat = SERVICE_CATEGORIES[t.serviceType] || SERVICE_CATEGORIES.GEN;
                  return (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono font-black text-slate-900">{t.tokenNumber}</td>
                      <td className="py-3 font-medium text-slate-700 flex items-center gap-1.5">
                        {getCategoryIcon(t.serviceType)}
                        {cat.name}
                      </td>
                      <td className="py-3 text-slate-500 font-medium">
                        {new Date(t.createdAt).toLocaleDateString([], {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                      <td className="py-3 text-slate-600 font-semibold">{t.servingCounterName || 'Station 1'}</td>
                      <td className="py-3">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800">
                          {t.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Book New Ticket Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-slate-200">
            <div>
              <h3 className="text-xl font-black text-slate-900">Book Queue Ticket</h3>
              <p className="text-xs text-slate-500 mt-1">
                Your verified CNIC <strong>{maskCNIC(user.cnic)}</strong> and phone will be automatically linked.
              </p>
            </div>

            {bookingMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{bookingMsg}</span>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Select Service Category
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {Object.values(SERVICE_CATEGORIES).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setBookingCategory(cat.id)}
                    className={`p-3.5 rounded-2xl border text-left cursor-pointer transition-all ${
                      bookingCategory === cat.id
                        ? 'border-indigo-600 bg-indigo-50/80 text-indigo-950 font-bold shadow-xs'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono font-bold px-1.5 py-0.5 bg-white rounded border border-slate-200 text-slate-600">
                        {cat.prefix}
                      </span>
                    </div>
                    <div className="font-extrabold text-sm mt-1">{cat.name}</div>
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={bookingPriority}
                onChange={(e) => setBookingPriority(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500"
              />
              <span>Senior / Accessibility Fast-Track</span>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowBookingModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={isBooking}
                onClick={handleBookTicket}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-md shadow-indigo-600/20"
              >
                {isBooking ? 'Generating Ticket...' : 'Confirm & Issue Ticket'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Profile Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleSaveProfile}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl border border-slate-200"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">Update Profile Details</h3>
              <p className="text-xs text-slate-500 mt-1">
                CNIC and Email are permanently locked for national security compliance.
              </p>
            </div>

            {editError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{editError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Mobile Phone Number
              </label>
              <input
                type="text"
                value={editPhone}
                onChange={(e) => setEditPhone(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                City / District
              </label>
              <input
                type="text"
                value={editCity}
                onChange={(e) => setEditCity(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Residential Address
              </label>
              <input
                type="text"
                value={editAddress}
                onChange={(e) => setEditAddress(e.target.value)}
                placeholder="House / Street / Sector"
                className="w-full px-4 py-3 rounded-2xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={editLoading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-md"
              >
                {editLoading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
