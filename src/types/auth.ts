export type UserRole = 'citizen' | 'admin' | 'staff';

export interface User {
  id: string;
  fullName: string;
  cnic: string;
  cnicMasked: string;
  mobile: string;
  mobileMasked: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: 'active' | 'suspended';
  city?: string;
  address?: string;
  createdAt: number;
  lastLoginAt?: number;
}

export interface UserPublic {
  id: string;
  fullName: string;
  cnic: string;
  cnicMasked: string;
  mobile: string;
  mobileMasked: string;
  email: string;
  role: UserRole;
  status: 'active' | 'suspended';
  city?: string;
  address?: string;
  createdAt: number;
  lastLoginAt?: number;
}

export interface AuthAuditLog {
  id: string;
  timestamp: number;
  action: string;
  performedBy: string;
  targetUser?: string;
  details: string;
  ipAddress?: string;
  status: 'SUCCESS' | 'WARNING' | 'DENIED';
}

export interface AuthResponse {
  token: string;
  user: UserPublic;
}
