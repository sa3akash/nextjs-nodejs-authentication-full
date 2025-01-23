import { Role } from '@middleware/auth';
import { Types } from 'mongoose';

export interface IUserDocument {
  _id: Types.ObjectId | string; // Unique identifier
  name: string; // Unique username
  email: string; // Unique email
  password: string; // Hashed password
  googleId: string; // googleId
  provider: string; // googleId
  githubId: string; // githubId
  profilePicture: string; // URL to profile picture     // Short user bio     // Timestamp of account creation
  updatedAt: string | Date; // Timestamp of last update     // Timestamp of last login
  role: Role; // Array of roles (e.g., ["user", "admin"])
  twoFactorEnabled: boolean; // Is two-factor authentication enabled?
  twoFactorSecret: string; // Secret for 2FA (if enabled)
  resetToken: string; // Token for password reset
  webauthnDevices: Array<{
    id: string; // Credential ID
    publicKey: string; // Base64 or Buffer-encoded public key
    counter: number; // Signature counter
    transports: AuthenticatorTransportFuture[]; // Authenticator transports (e.g., "usb", "ble")
  }>;
  challenge: string;
  resetTokenExpires: string | Date;
  isVerified: Date;
  comparePassword(password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}

export type AuthenticatorTransportFuture = 'ble' | 'cable' | 'hybrid' | 'internal' | 'nfc' | 'smart-card' | 'usb';