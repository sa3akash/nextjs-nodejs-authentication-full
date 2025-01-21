import { userModel } from '@admin/models/auth.model';
import { IUserDocument } from '@admin/interfaces/auth.interface';

class AdminService {
  public async getUserById(id: string): Promise<IUserDocument | null> {
    return userModel.findById(id);
  }

  public async getUserByEmail(email: string): Promise<IUserDocument | null> {
    return userModel.findOne({
      email: email
    });
  }

  public async addAdmin({
    name,
    email,
    password,
    phoneNumber
  }: {
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
  }): Promise<IUserDocument> {
    return userModel.create({
      name,
      email,
      password,
      phoneNumber,
      role: 'admin'
    });
  }

  public async addModerator({
    name,
    email,
    password,
    phoneNumber
  }: {
    name: string;
    email: string;
    password: string;
    phoneNumber: string;
  }): Promise<IUserDocument> {
    return userModel.create({
      name,
      email,
      password,
      phoneNumber,
      role: 'moderator'
    });
  }

  public async resetPassword(email: string, hashPassword: string): Promise<void> {
    await userModel.findOneAndUpdate(
      { email },
      {
        $set: {
          password: hashPassword,
          resetPasswordToken: ''
        }
      }
    );
  }

  public async updateAdminResetToken(email: string, token: string): Promise<void> {
    await userModel.findOneAndUpdate(
      {
        email: email
      },
      {
        $set: {
          resetPasswordToken: token
        }
      }
    );
  }

  public async getUserByResetToken(token: string): Promise<IUserDocument | null> {
    return userModel.findOne({
      resetPasswordToken: token
    });
  }

  public async getAllAdmin() {
    return userModel.find({ $or: [{ role: 'admin' }, { role: 'moderator' }] }).select('-resetPasswordToken');
  }

  public async changeRole(role: string, id: string): Promise<IUserDocument | null> {
    return userModel.findByIdAndUpdate(id, { $set: { role } }, { new: true });
  }

  public async updateAdmin(name: string, phoneNumber: string, id: string): Promise<IUserDocument | null> {
    return userModel.findByIdAndUpdate(id, { $set: { name, phoneNumber } }, { new: true });
  }
}

export const adminService = new AdminService();
