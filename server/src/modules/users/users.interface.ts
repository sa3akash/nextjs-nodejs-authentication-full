import { Role } from '@middleware/auth';
import {Types} from "mongoose";

export interface IUserDocument {
  _id: Types.ObjectId | string,                 // Unique identifier
  name: string,              // Unique username
  email: string,                 // Unique email
  password: string,          // Hashed password
  profilePicture: string,        // URL to profile picture     // Short user bio     // Timestamp of account creation
  updatedAt: string | Date,               // Timestamp of last update     // Timestamp of last login
  role: Role,               // Array of roles (e.g., ["user", "admin"])
  twoFactorEnabled: boolean,     // Is two-factor authentication enabled?
  twoFactorSecret: string,       // Secret for 2FA (if enabled)
  resetToken: string,            // Token for password reset
  resetTokenExpires: string | Date,
  comparePassword(password: string): Promise<boolean>;
  hashPassword(password: string): Promise<string>;
}