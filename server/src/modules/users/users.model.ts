import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import { IUserDocument } from '@admin/interfaces/auth.interface';

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
      enum: ['admin', 'teacher', 'student', 'moderator'],
      default: 'student'
    },
    name: {
      type: String,
      required: true
    },
    phoneNumber: {
      type: String,
      required: true
    },
    password: {
      type: String,
      required: true
    },
    resetPasswordToken: {
      type: String,
      default: ''
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

export const userModel = mongoose.model('User', UserSchema, 'User');
