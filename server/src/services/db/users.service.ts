import { IUserDocument } from '@root/modules/users/users.interface';
import { userModel } from '@root/modules/users/users.model';
import { ServerError } from 'error-express';
import { emailQueue } from '@services/queues/emailQueue';
import { emailTemplates } from '@services/mailers';
import { jwtService } from '@services/utils/jwt.services';
import { Request } from 'express';

class UsersService {
  public async getUserById(id: string): Promise<IUserDocument | null> {
    return userModel.findById(id);
  }

  public async getUserByEmail(email: string): Promise<IUserDocument | null> {
    return userModel.findOne({
      email: email
    });
  }

  public async addUser(data: { email: string; password: string; name: string }): Promise<void> {
    const user = await this.getUserByEmail(data.email);
    if (user) throw new ServerError('User already exists', 409);
    const newUser = await userModel.create(data);

    const jwtToken = jwtService.signVerifyToken({ userId: `${newUser._id}` });

    const template: string = emailTemplates.verifyEmail('http://localhost:3000/verify?token=' + jwtToken);

    emailQueue.sendEmail('sendEmail', {
      receiverEmail: newUser.email,
      template: template,
      subject: 'Verify your email address.'
    });
  }

  public async verifyEmailAddress(token: string): Promise<void> {
    const payload = jwtService.verifyVerifyToken(token) as { userId: string };

    if (!payload) throw new ServerError('Invalid token', 401);

    const user = await this.getUserById(payload.userId);

    if(user?.isVerified){
      throw new ServerError('User already verified', 400);
    }

    await userModel.findByIdAndUpdate(payload.userId, {
      $set: {
        isVerified: Date.now()
      }
    });
  }

  public async loginUser(req: Request) {
    const user = await this.getUserByEmail(req.body.email);
    if (!user || !(await user.comparePassword(req.body.password))) {
      throw new ServerError('Invalid credentials', 400);
    }

    if (!user.isVerified) {
      const jwtToken = jwtService.signVerifyToken({ userId: `${user._id}` });

      const template: string = emailTemplates.verifyEmail('https://localhost:3000/verify?token=' + jwtToken);

      emailQueue.sendEmail('sendEmail', {
        receiverEmail: user.email,
        template: template,
        subject: 'Verify your email address.'
      });

      return {
        status: 'success',
        message: 'Check your email address and verify your account.'
      };
    }

    const ip = req.ip || req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const userAgent = req.headers["user-agent"];


    const accessToken = jwtService.signToken({ userId: `${user._id}` });
    const refreshToken = jwtService.signTokenRefresh({ userId: `${user._id}` });

    return {
      user: {
        _id: user._id,
        name: user.name,
        email:user.email,
        isVerified: user.isVerified,
        role: user.role,
        profilePicture: user.profilePicture
      },
      accessToken,
      refreshToken
    };
  }

  public async refreshTokenGenerate(token: string) {
    const payload = jwtService.verifyTokenRefresh(token) as { userId: string };

    if (!payload) throw new ServerError('Invalid token', 401);

    const user = await userModel.findById(payload.userId);
    if(!user) throw new ServerError('User does not exist', 404);

    const accessToken = jwtService.signToken({ userId: `${user._id}` });
    const refreshToken = jwtService.signTokenRefresh({ userId: `${user._id}` });

    return {
      accessToken,
      refreshToken
    }
  }
}

export const usersService = new UsersService();
