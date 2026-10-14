import React, { useState, useEffect } from 'react';
import { UserPublic, AuthAuditLog, UserRole } from '../types/auth.ts';
import { maskCNIC, maskPhone, validateCNIC, validatePhone, validateEmail, validatePassword } from '../utils/security.ts';
import {
  Users,
  ShieldCheck,
  ShieldAlert,
  Search,
  Filter,
  UserPlus,
  KeyRound,
  Download,
  AlertCircle,
  CheckCircle2,
  Lock,
  Mail,
  Phone,
  CreditCard,
  Building,
  Edit2,
  Trash2,
  LogOut,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  UserX,
  Activity,
  History,
  FileSpreadsheet,
} from 'lucide-react';

import { useLanguage } from '../context/LanguageContext.tsx';

interface AdminDashboardViewProps {
  adminUser: UserPublic;
  onLogout: () => void;
}

export const AdminDashboardView: React.FC<AdminDashboardViewProps> = ({ adminUser, onLogout }) => {
  const { language, t, isRtl } = useLanguage();
  const [activeTab, setActiveTab] = useState<'users' | 'audit'>('users');
  const [users, setUsers] = useState<UserPublic[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuthAuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Add User modal state
  const [showAddModal, setShowAddModal] = useState<boolean>(false);
  const [newFullName, setNewFullName] = useState<string>('');
  const [newCnic, setNewCnic] = useState<string>('');
  const [newMobile, setNewMobile] = useState<string>('');
  const [newEmail, setNewEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('Citizen123!');
  const [newRole, setNewRole] = useState<UserRole>('citizen');
  const [newCity, setNewCity] = useState<string>('Islamabad');
  const [addError, setAddError] = useState<string | null>(null);
  const [addLoading, setAddLoading] = useState<boolean>(false);

  // Edit user state
  const [editingUser, setEditingUser] = useState<UserPublic | null>(null);

  // Reveal CNIC for selected user
  const [revealedCnicUserId, setRevealedCnicUserId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('civic_auth_token');
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(searchQuery)}&role=${roleFilter}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch (err) {
      console.warn('Error fetching admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAuditLogs = async () => {
    try {
      const token = localStorage.getItem('civic_auth_token');
      const res = await fetch('/api/admin/audit-logs?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAuditLogs(data.logs || []);
      }
    } catch (err) {
      console.warn('Error fetching audit logs:', err);
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchAuditLogs();
  }, [searchQuery, roleFilter]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddError(null);

    const cnicVal = validateCNIC(newCnic);
    if (!cnicVal.isValid) {
      setAddError(cnicVal.error || 'Invalid CNIC format');
      return;
    }

    const phoneVal = validatePhone(newMobile);
    if (!phoneVal.isValid) {
      setAddError(phoneVal.error || 'Invalid mobile phone number');
      return;
    }

    if (!validateEmail(newEmail)) {
      setAddError('Invalid email address');
      return;
    }

    const passVal = validatePassword(newPassword);
    if (!passVal.isValid) {
      setAddError(passVal.error || 'Password must be at least 6 characters');
      return;
    }

    try {
      setAddLoading(true);
      const token = localStorage.getItem('civic_auth_token');
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: newFullName.trim(),
          cnic: cnicVal.normalized,
          mobile: phoneVal.normalized,
          email: newEmail.trim().toLowerCase(),
          password: newPassword,
          city: newCity,
        }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to create user');
      }

      // If non-citizen role, promote immediately
      const createdData = await res.json();
      if (newRole !== 'citizen') {
        await fetch(`/api/admin/users/${createdData.user.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ role: newRole }),
        });
      }

      setShowAddModal(false);
      setNewFullName('');
      setNewCnic('');
      setNewMobile('');
      setNewEmail('');
      fetchUsers();
      fetchAuditLogs();
    } catch (err: any) {
      setAddError(err.message || 'Creation error');
    } finally {
      setAddLoading(false);
    }
  };

  const handleToggleStatus = async (user: UserPublic) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      const token = localStorage.getItem('civic_auth_token');
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchUsers();
      fetchAuditLogs();
    } catch (err) {
      console.error('Toggle status error:', err);
    }
  };

  const handleChangeRole = async (user: UserPublic, role: UserRole) => {
    try {
      const token = localStorage.getItem('civic_auth_token');
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role }),
      });
      fetchUsers();
      fetchAuditLogs();
    } catch (err) {
      console.error('Role update error:', err);
    }
  };

  const handleDeleteUser = async (user: UserPublic) => {
    if (!window.confirm(`Are you sure you want to permanently delete account for ${user.fullName} (${user.email})?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('civic_auth_token');
      await fetch(`/api/admin/users/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchUsers();
      fetchAuditLogs();
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Full Name', 'CNIC', 'Mobile Phone', 'Email', 'Role', 'Status', 'City', 'Created Date'];
    const rows = users.map((u) => [
      u.id,
      `"${u.fullName}"`,
      u.cnic,
      u.mobile,
      u.email,
      u.role,
      u.status,
      `"${u.city || ''}"`,
      new Date(u.createdAt).toISOString(),
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `civic_citizens_registry_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const citizensCount = users.filter((u) => u.role === 'citizen').length;
  const staffCount = users.filter((u) => u.role === 'staff' || u.role === 'admin').length;
  const suspendedCount = users.filter((u) => u.status === 'suspended').length;

  return (
    <div className="max-w-7xl mx-auto py-8 sm:py-10 px-4 sm:px-6 lg:px-8 space-y-8" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Banner / Admin Authority Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6 border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center font-black text-2xl shadow-xl">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">Central Admin & Citizen Directory</h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-400/20 text-amber-300 border border-amber-400/30">
                Administrator
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1">
              Logged in as <strong className="text-white">{adminUser.email}</strong> • National Identity & Access Management
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer flex items-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            Add New Citizen
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-slate-200 text-xs font-bold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 border border-white/10"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Export CSV
          </button>
          <button
            onClick={onLogout}
            className="px-3.5 py-2.5 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-xs font-bold rounded-2xl transition-colors cursor-pointer flex items-center gap-1.5 border border-rose-500/30"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </button>
        </div>
      </div>

      {/* Metric Cards Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Total Citizens</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{citizensCount}</div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 block">Verified CNIC records</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Staff & Admins</span>
          <div className="text-3xl font-black text-indigo-600 mt-1">{staffCount}</div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Authorized operators</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Suspended Accounts</span>
          <div className="text-3xl font-black text-rose-600 mt-1">{suspendedCount}</div>
          <span className="text-[11px] text-slate-500 font-semibold mt-1 block">Access revoked</span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-2xs">
          <span className="text-slate-400 text-xs font-bold uppercase tracking-wider block">Security Audit Events</span>
          <div className="text-3xl font-black text-slate-900 mt-1">{auditLogs.length}</div>
          <span className="text-[11px] text-indigo-600 font-semibold mt-1 block">Tracked system events</span>
        </div>
      </div>

      {/* Tabs Switcher: User Directory vs Security Audit Logs */}
      <div className="flex border-b border-slate-200 gap-4">
        <button
          onClick={() => setActiveTab('users')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            activeTab === 'users'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Registered Citizens Directory</span>
        </button>
        <button
          onClick={() => setActiveTab('audit')}
          className={`pb-3 text-sm font-extrabold flex items-center gap-2 border-b-2 cursor-pointer transition-all ${
            activeTab === 'audit'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Security & Authentication Audit Trail</span>
        </button>
      </div>

      {/* View Mode: Citizens Directory */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-2xs">
          {/* Search and Filters Toolbar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, CNIC (13 digits), mobile, email..."
                className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Role:</span>
              <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                {['ALL', 'citizen', 'staff', 'admin'].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRoleFilter(r)}
                    className={`px-3 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                      roleFilter === r ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                    }`}
                  >
                    {r.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-bold">Citizen Name</th>
                  <th className="pb-3 font-bold">National CNIC</th>
                  <th className="pb-3 font-bold">Mobile Phone</th>
                  <th className="pb-3 font-bold">Email</th>
                  <th className="pb-3 font-bold">Role</th>
                  <th className="pb-3 font-bold">Status</th>
                  <th className="pb-3 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCnicRevealed = revealedCnicUserId === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      {/* Name */}
                      <td className="py-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-black">
                            {u.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-slate-900">{u.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{u.city || 'Islamabad'}</div>
                          </div>
                        </div>
                      </td>

                      {/* CNIC */}
                      <td className="py-3.5 font-mono font-bold text-slate-800">
                        <div className="flex items-center gap-2">
                          <span>{isCnicRevealed ? u.cnic : u.cnicMasked}</span>
                          <button
                            onClick={() => setRevealedCnicUserId(isCnicRevealed ? null : u.id)}
                            className="text-slate-400 hover:text-indigo-600 cursor-pointer"
                            title={isCnicRevealed ? 'Hide full CNIC' : 'Reveal full CNIC for admin audit'}
                          >
                            {isCnicRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 font-mono text-slate-700 font-medium">{u.mobile}</td>

                      {/* Email */}
                      <td className="py-3.5 text-slate-600 font-medium truncate max-w-[160px]" title={u.email}>
                        {u.email}
                      </td>

                      {/* Role */}
                      <td className="py-3.5">
                        <select
                          value={u.role}
                          onChange={(e) => handleChangeRole(u, e.target.value as UserRole)}
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider border cursor-pointer ${
                            u.role === 'admin'
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : u.role === 'staff'
                              ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <option value="citizen">CITIZEN</option>
                          <option value="staff">STAFF</option>
                          <option value="admin">ADMIN</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3.5">
                        <button
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider cursor-pointer border ${
                            u.status === 'active'
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300 hover:bg-rose-100 hover:text-rose-800'
                              : 'bg-rose-100 text-rose-800 border-rose-300 hover:bg-emerald-100 hover:text-emerald-800'
                          }`}
                          title="Click to toggle account status"
                        >
                          {u.status}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 text-right">
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete user account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* View Mode: Security Audit Logs */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 space-y-4 shadow-2xs">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <History className="w-5 h-5 text-indigo-600" />
                Security Access & Authentication Trail
              </h2>
              <p className="text-xs text-slate-500">
                Immutable compliance log of citizen registrations, role elevations, and login events
              </p>
            </div>
            <button
              onClick={fetchAuditLogs}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh Logs
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] tracking-wider">
                  <th className="pb-3 font-bold">Timestamp</th>
                  <th className="pb-3 font-bold">Event Action</th>
                  <th className="pb-3 font-bold">Target Account</th>
                  <th className="pb-3 font-bold">Role</th>
                  <th className="pb-3 font-bold">IP Address</th>
                  <th className="pb-3 font-bold">Audit Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditLogs.map((log) => {
                  const isSuccess = log.action.includes('SUCCESS') || log.action === 'REGISTER';
                  const isAlert = log.action.includes('FAILED') || log.action.includes('SUSPENDED');

                  return (
                    <tr key={log.id} className="hover:bg-slate-50">
                      <td className="py-3 font-mono text-slate-500 font-medium">
                        {new Date(log.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
                        })}{' '}
                        • {new Date(log.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </td>
                      <td className="py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase font-mono ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : isAlert
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-indigo-100 text-indigo-800'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="py-3 font-bold text-slate-800">{log.performedBy || 'System'}</td>
                      <td className="py-3 text-slate-500 font-semibold">{log.status || '-'}</td>
                      <td className="py-3 font-mono text-slate-500">{log.ipAddress}</td>
                      <td className="py-3 text-slate-600 font-medium">{log.details || '-'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add New Citizen Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
          <form
            onSubmit={handleCreateUser}
            className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border border-slate-200"
          >
            <div>
              <h3 className="text-xl font-black text-slate-900">Add New Citizen / Staff Account</h3>
              <p className="text-xs text-slate-500 mt-1">
                Enter verified identification credentials. CNIC must be 13 digits.
              </p>
            </div>

            {addError && (
              <div className="p-3 bg-rose-50 text-rose-700 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{addError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Full Legal Name *
              </label>
              <input
                type="text"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                placeholder="e.g. Tariq Mahmood"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  13-Digit CNIC *
                </label>
                <input
                  type="text"
                  value={newCnic}
                  onChange={(e) => setNewCnic(e.target.value)}
                  placeholder="XXXXX-XXXXXXX-X"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-mono font-bold focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Mobile Phone *
                </label>
                <input
                  type="text"
                  value={newMobile}
                  onChange={(e) => setNewMobile(e.target.value)}
                  placeholder="0300-1234567"
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                Email Address *
              </label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                placeholder="tariq@example.com"
                required
                className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-500 font-medium"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Temporary Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-2xl border border-slate-300 text-xs font-medium"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
                  Role Permission
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2.5 rounded-2xl border border-slate-300 text-xs font-bold"
                >
                  <option value="citizen">Citizen</option>
                  <option value="staff">Staff Agent</option>
                  <option value="admin">Administrator</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={addLoading}
                className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-2xl text-xs transition-all cursor-pointer shadow-md"
              >
                {addLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
