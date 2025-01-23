import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument } from '@root/modules/users/users.interface';

const UserSchema = new mongoose.Schema<IUserDocument>(
  {
    email: {
      type: String,
      default: null
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
    googleId: {
      type: String,
      default: null
    },
    githubId: {
      type: String,
      default: null
    },
    provider: {
      type: String,
      default: null
    },
    password: {
      type: String,
      default: null
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
    challenge: {
      type: String,
      default: null
    },
    webauthnDevices: [
      {
        id: { type: String, required: true },
        publicKey: { type: String, required: true },
        counter: { type: Number, required: true },
        transports: { type: [String], default: [] },
      }
    ],
    twoFactorSecret: {
      type: String,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        return ret;
      }
    }
  }
);

UserSchema.pre('save', async function (next) {
  if(this.password){
    this.password = await bcrypt.hash(this.password, 10);
    next();
  }
});

UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  const hashPassword = this.password;
  return await bcrypt.compare(password, hashPassword);
};

UserSchema.methods.hashPassword = async function (password: string): Promise<string> {
  return await bcrypt.hash(password, 10);
};

export const userModel = mongoose.model('User', UserSchema, 'users');
