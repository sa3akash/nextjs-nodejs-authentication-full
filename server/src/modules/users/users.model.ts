import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument } from '@root/modules/users/users.interface';

const UserSchema = new mongoose.Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'user'],
      default: 'user'
    },
    name: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    profilePicture: {
      type: String,
      default: null
    },
    isVerified: {
      type: Date,
      default: null
    },
    resetToken: {
      type: String,
      default: null
    },
    resetTokenExpires: {
      type: Date,
      default: null
    },
    twoFactorEnabled: {
      type: Boolean,
      default: false
    },
    twoFactorSecret: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.passwordHash;
        return ret;
      }
    }
  }
);

UserSchema.pre('save', async function (next) {
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const hashPassword = this.password;
  return await bcrypt.compare(password, hashPassword);
};

UserSchema.methods.hashPassword = async function (password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
};

export const userModel = mongoose.model('User', UserSchema, 'users');
