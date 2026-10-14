import { User, UserPublic, UserRole, AuthAuditLog, AuthResponse } from '../types/auth.ts';
import { validateCNIC, maskCNIC, validatePhone, maskPhone, validateEmail, validatePassword } from '../utils/security.ts';

// In-memory operational store for registered citizens, administrators, and security audit logs
class UserStore {
  private users: Map<string, User> = new Map();
  // Map session token -> user id
  private sessions: Map<string, { userId: string; expiresAt: number }> = new Map();
  private auditLogs: AuthAuditLog[] = [];

  constructor() {
    this.seedDefaultUsers();
  }

  private seedDefaultUsers() {
    const defaultUsers: {
      id: string;
      fullName: string;
      cnic: string;
      mobile: string;
      email: string;
      passwordPlain: string;
      role: UserRole;
      city: string;
      address: string;
    }[] = [
      {
        id: 'usr_admin_1',
        fullName: 'Chief Operations Director',
        cnic: '37405-1122334-1',
        mobile: '0300-9876543',
        email: 'admin@civicqueue.gov',
        passwordPlain: 'AdminPassword123!',
        role: 'admin',
        city: 'Islamabad',
        address: 'Civic Authority Secretariat, Sector G-5',
      },
      {
        id: 'usr_cit_1',
        fullName: 'Ahmed Raza',
        cnic: '42101-8765432-1',
        mobile: '0312-3456789',
        email: 'citizen@civicqueue.gov',
        passwordPlain: 'Citizen123!',
        role: 'citizen',
        city: 'Karachi',
        address: 'House 42, Block 6, PECHS',
      },
      {
        id: 'usr_cit_2',
        fullName: 'Fatima Noor',
        cnic: '61101-1234567-8',
        mobile: '0333-5551234',
        email: 'fatima.noor@civicqueue.gov',
        passwordPlain: 'Citizen123!',
        role: 'citizen',
        city: 'Lahore',
        address: 'Model Town, Block B',
      },
      {
        id: 'usr_cit_3',
        fullName: 'Tariq Mehmood',
        cnic: '35202-9871234-5',
        mobile: '0321-7788990',
        email: 'tariq.mehmood@civicqueue.gov',
        passwordPlain: 'Citizen123!',
        role: 'citizen',
        city: 'Rawalpindi',
        address: 'Commercial Market, Satellite Town',
      },
    ];

    for (const u of defaultUsers) {
      const cnicVal = validateCNIC(u.cnic);
      const cnicFormatted = cnicVal.valid ? cnicVal.formatted : u.cnic;
      const phoneVal = validatePhone(u.mobile);
      const phoneFormatted = phoneVal.valid ? phoneVal.formatted : u.mobile;

      const user: User = {
        id: u.id,
        fullName: u.fullName,
        cnic: cnicFormatted,
        cnicMasked: maskCNIC(cnicFormatted),
        mobile: phoneFormatted,
        mobileMasked: maskPhone(phoneFormatted),
        email: u.email.toLowerCase(),
        passwordHash: this.hashPassword(u.passwordPlain),
        role: u.role,
        status: 'active',
        city: u.city,
        address: u.address,
        createdAt: Date.now() - 1000 * 60 * 60 * 24 * 7, // 7 days ago
        lastLoginAt: Date.now() - 1000 * 60 * 30,
      };
      this.users.set(user.id, user);
    }

    this.addAuditLog(
      'SYSTEM_INITIALIZED',
      'system',
      'Initialized default administrator and citizen demo accounts with masked credentials',
      'SUCCESS'
    );
  }

  // Simple, deterministic salted hash simulation suitable for lightweight in-memory storage
  private hashPassword(password: string): string {
    let hash = 0;
    const salt = 'civic_secure_salt_#2026';
    const str = password + salt;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash |= 0;
    }
    return `sha256_mock_${Math.abs(hash).toString(16)}`;
  }

  public toPublicUser(user: User): UserPublic {
    return {
      id: user.id,
      fullName: user.fullName,
      cnic: user.cnic,
      cnicMasked: user.cnicMasked,
      mobile: user.mobile,
      mobileMasked: user.mobileMasked,
      email: user.email,
      role: user.role,
      status: user.status,
      city: user.city,
      address: user.address,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    };
  }

  private generateToken(userId: string): string {
    const random = Math.random().toString(36).substring(2) + Date.now().toString(36);
    const token = `cq_tok_${userId}_${random}`;
    // 7 days expiration
    this.sessions.set(token, {
      userId,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
    });
    return token;
  }

  public getUserByToken(token: string): UserPublic | null {
    const session = this.sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(token);
      return null;
    }
    const user = this.users.get(session.userId);
    if (!user) return null;
    return this.toPublicUser(user);
  }

  public async register(data: {
    fullName: string;
    cnic: string;
    mobile: string;
    email: string;
    password: string;
    city?: string;
    address?: string;
    ipAddress?: string;
    userAgent?: string;
  }): Promise<AuthResponse> {
    const { fullName, cnic, mobile, email, password, city, address, ipAddress } = data;

    if (!fullName || !fullName.trim()) {
      throw new Error('Full Name is required');
    }

    // CNIC Validation
    const cnicCheck = validateCNIC(cnic);
    if (!cnicCheck.valid) {
      throw new Error(cnicCheck.error || 'Invalid CNIC number format');
    }

    // Phone Validation
    const phoneCheck = validatePhone(mobile);
    if (!phoneCheck.valid) {
      throw new Error(phoneCheck.error || 'Invalid mobile phone format');
    }

    // Email Validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.valid) {
      throw new Error(emailCheck.error || 'Invalid email address format');
    }

    // Password Validation
    const passCheck = validatePassword(password);
    if (!passCheck.valid) {
      throw new Error(passCheck.error || 'Invalid password requirements');
    }

    // Check unique CNIC
    const normalizedCnic = cnicCheck.formatted;
    for (const u of this.users.values()) {
      if (u.cnic === normalizedCnic) {
        this.addAuditLog(
          'REGISTER_DUPLICATE_CNIC',
          email,
          `Attempted registration with existing CNIC: ${maskCNIC(normalizedCnic)}`,
          'DENIED',
          undefined,
          ipAddress
        );
        throw new Error('A citizen account is already registered with this CNIC number');
      }
    }

    // Check unique Email
    const normalizedEmail = email.trim().toLowerCase();
    for (const u of this.users.values()) {
      if (u.email === normalizedEmail) {
        throw new Error('An account with this email address already exists');
      }
    }

    const userId = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const newUser: User = {
      id: userId,
      fullName: fullName.trim(),
      cnic: normalizedCnic,
      cnicMasked: maskCNIC(normalizedCnic),
      mobile: phoneCheck.formatted,
      mobileMasked: maskPhone(phoneCheck.formatted),
      email: normalizedEmail,
      passwordHash: this.hashPassword(password),
      role: 'citizen',
      status: 'active',
      city: city?.trim() || 'Islamabad',
      address: address?.trim() || '',
      createdAt: Date.now(),
      lastLoginAt: Date.now(),
    };

    this.users.set(newUser.id, newUser);
    const token = this.generateToken(newUser.id);

    this.addAuditLog(
      'REGISTER_SUCCESS',
      newUser.email,
      `New citizen registered: ${newUser.fullName} [CNIC: ${newUser.cnicMasked}]`,
      'SUCCESS',
      newUser.id,
      ipAddress
    );

    return {
      token,
      user: this.toPublicUser(newUser),
    };
  }

  public async login(
    identifier: string,
    password: string,
    options?: {
      requireRole?: 'admin' | 'citizen';
      ipAddress?: string;
      userAgent?: string;
    }
  ): Promise<AuthResponse> {
    const cleanId = (identifier || '').trim().toLowerCase();
    const cleanCnicDigits = identifier ? identifier.replace(/\D/g, '') : '';
    const cleanPhoneDigits = identifier ? identifier.replace(/\D/g, '') : '';

    if (!cleanId || !password) {
      throw new Error('Username/Email/CNIC and password are required');
    }

    // Find user by email, CNIC, mobile, or username match
    let foundUser: User | null = null;
    for (const u of this.users.values()) {
      if (u.email === cleanId) {
        foundUser = u;
        break;
      }
      // If entered as CNIC (13 digits match)
      if (cleanCnicDigits.length === 13 && u.cnic.replace(/\D/g, '') === cleanCnicDigits) {
        foundUser = u;
        break;
      }
      // If entered as phone number
      if (cleanPhoneDigits.length >= 10 && u.mobile.replace(/\D/g, '').endsWith(cleanPhoneDigits.slice(-10))) {
        foundUser = u;
        break;
      }
      // If username matches admin
      if (cleanId === 'admin' && u.role === 'admin') {
        foundUser = u;
        break;
      }
    }

    const ip = options?.ipAddress || '127.0.0.1';

    if (!foundUser) {
      this.addAuditLog(
        'LOGIN_FAILED',
        identifier,
        `Failed authentication attempt: user identifier not found`,
        'DENIED',
        undefined,
        ip
      );
      throw new Error('Invalid credentials. Please verify your email/CNIC and password.');
    }

    if (foundUser.status === 'suspended') {
      this.addAuditLog(
        'LOGIN_BLOCKED',
        foundUser.email,
        `Blocked login attempt on suspended account`,
        'DENIED',
        foundUser.id,
        ip
      );
      throw new Error('This account has been suspended by system administration.');
    }

    // Check Role requirement
    if (options?.requireRole === 'admin' && foundUser.role !== 'admin') {
      this.addAuditLog(
        'ADMIN_GATEWAY_DENIED',
        foundUser.email,
        `Unauthorized citizen attempted to access administrator secure gateway`,
        'DENIED',
        foundUser.id,
        ip
      );
      throw new Error('Access Denied: This portal requires Administrator privileges.');
    }

    // Verify Password
    const expectedHash = this.hashPassword(password);
    if (foundUser.passwordHash !== expectedHash) {
      this.addAuditLog(
        'LOGIN_FAILED_PASSWORD',
        foundUser.email,
        `Incorrect password entered for account`,
        'DENIED',
        foundUser.id,
        ip
      );
      throw new Error('Invalid credentials. Password does not match.');
    }

    // Update last login
    foundUser.lastLoginAt = Date.now();
    const token = this.generateToken(foundUser.id);

    this.addAuditLog(
      'LOGIN_SUCCESS',
      foundUser.email,
      `User authenticated successfully as ${foundUser.role.toUpperCase()}`,
      'SUCCESS',
      foundUser.id,
      ip
    );

    return {
      token,
      user: this.toPublicUser(foundUser),
    };
  }

  public getAllUsers(search?: string, roleFilter?: string): UserPublic[] {
    let list = Array.from(this.users.values());

    if (roleFilter && roleFilter !== 'ALL') {
      list = list.filter((u) => u.role.toLowerCase() === roleFilter.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (u) =>
          u.fullName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          u.cnic.includes(q) ||
          u.mobile.includes(q) ||
          (u.city && u.city.toLowerCase().includes(q))
      );
    }

    // Sort by recent registration
    list.sort((a, b) => b.createdAt - a.createdAt);

    return list.map((u) => this.toPublicUser(u));
  }

  public updateUser(
    id: string,
    updates: Partial<User>,
    performedBy: string
  ): UserPublic {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('User not found');
    }

    if (updates.fullName) user.fullName = updates.fullName.trim();
    if (updates.city) user.city = updates.city.trim();
    if (updates.address !== undefined) user.address = updates.address.trim();
    if (updates.status) user.status = updates.status;
    if (updates.role) user.role = updates.role;

    if (updates.mobile) {
      const p = validatePhone(updates.mobile);
      if (p.valid) {
        user.mobile = p.formatted;
        user.mobileMasked = maskPhone(p.formatted);
      }
    }

    if (updates.cnic) {
      const c = validateCNIC(updates.cnic);
      if (c.valid) {
        user.cnic = c.formatted;
        user.cnicMasked = maskCNIC(c.formatted);
      }
    }

    this.addAuditLog(
      'USER_UPDATED',
      performedBy,
      `Updated user profile for ${user.fullName} (${user.id})`,
      'SUCCESS',
      user.id
    );

    return this.toPublicUser(user);
  }

  public deleteUser(id: string, performedBy: string): boolean {
    const user = this.users.get(id);
    if (!user) return false;

    // Prevent deleting main admin
    if (user.role === 'admin' && user.email === 'admin@civicqueue.gov') {
      throw new Error('Cannot delete primary system administrator account');
    }

    this.users.delete(id);

    // Invalidate sessions
    for (const [token, sess] of this.sessions.entries()) {
      if (sess.userId === id) {
        this.sessions.delete(token);
      }
    }

    this.addAuditLog(
      'USER_DELETED',
      performedBy,
      `Deleted user account: ${user.fullName} [CNIC: ${user.cnicMasked}]`,
      'WARNING',
      id
    );

    return true;
  }

  public addAuditLog(
    action: string,
    performedBy: string,
    details: string,
    status: 'SUCCESS' | 'WARNING' | 'DENIED' = 'SUCCESS',
    targetUser?: string,
    ipAddress?: string
  ) {
    const log: AuthAuditLog = {
      id: `log_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      timestamp: Date.now(),
      action,
      performedBy,
      targetUser,
      details,
      ipAddress: ipAddress || '127.0.0.1',
      status,
    };

    this.auditLogs.unshift(log);
    // Keep last 500 audit logs
    if (this.auditLogs.length > 500) {
      this.auditLogs.pop();
    }
  }

  public getAuditLogs(limit: number = 50): AuthAuditLog[] {
    return this.auditLogs.slice(0, limit);
  }
}

export const userStore = new UserStore();
