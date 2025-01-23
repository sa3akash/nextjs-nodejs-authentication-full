import { Request, Response } from 'express';
import { auth } from '@middleware/auth';
import { IUserDocument } from '@root/modules/users/users.interface';
import { ServerError } from 'error-express';
import speakeasy from 'speakeasy';
import { userModel } from '@root/modules/users/users.model';
import qrcode from 'qrcode';
import { usersService } from '@services/db/users.service';


export class SecurityController {
  @auth()
  public async generate(req: Request, res: Response) {
    const user = req.user as IUserDocument;

    if (user.twoFactorEnabled) {
      throw new ServerError('Two-factor authentication is already enabled.', 400);
    }

    let mfaSecret = user?.twoFactorSecret;

    if (!mfaSecret) {
      const secret = speakeasy.generateSecret({
        name: 'Master Auth',
        issuer: 'http://localhost:5500'
      });

      mfaSecret = secret.base32;

      await userModel.findByIdAndUpdate(`${user?._id}`, {
        $set: {
          twoFactorSecret: secret.base32
        }
      });
    }

    const url = speakeasy.otpauthURL({
      secret: mfaSecret,
      encoding: 'base32',
      label: `MA-${user?.name}`
      // issuer: 'http://localhost:5500'
    });
    const qrcodeImage = await qrcode.toDataURL(url);

    res.status(200).json({
      message: 'Scan the qrcode or setup secret key',
      secretKey: mfaSecret,
      qrcodeImage: qrcodeImage
    });
  }

  @auth()
  public async verify(req: Request, res: Response) {
    const user = req.user as IUserDocument;
    const { code } = req.body;

    if (!code) {
      throw new ServerError('Code are required', 400);
    }

    if (user?.twoFactorEnabled) {
      throw new ServerError('Two-factor authentication is already enabled.', 400);
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
      // window: 1
    });

    if (!isValid) {
      throw new ServerError('Invalid code.', 400);
    }

    await userModel.findByIdAndUpdate(user?._id, {
      $set: {
        twoFactorEnabled: true
      }
    });

    res.status(200).json({
      message: 'Two-factor authentication successful.',
      enable2FA: true
    });
  }

  @auth()
  public async twoFaOff(req: Request, res: Response) {
    const { code } = req.body;
    if (!code) {
      throw new ServerError('Code are required', 400);
    }

    const user = req.user as IUserDocument;

    if (!user?.twoFactorEnabled) {
      throw new ServerError('Two-factor authentication is already disabled.', 400);
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
      // window: 1
    });

    if (!isValid) {
      throw new ServerError('Invalid code.', 400);
    }

    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        twoFactorEnabled: false
      }
    });

    res.status(200).json({
      message: '2FA Authentication disabled.'
    });
  }

  public async twoFaLogin(req: Request, res: Response) {
    const { code, email } = req.body;
    if (!code || !email) {
      throw new ServerError('All are required', 400);
    }

    const user = await userModel.findOne({ email });

    if (!user) {
      throw new ServerError('User not found', 404);
    }

    const isValid = speakeasy.totp.verify({
      secret: user.twoFactorSecret,
      encoding: 'base32',
      token: code
      // window: 1
    });

    if (!isValid) {
      throw new ServerError('Invalid code.', 400);
    }

    const data = await usersService.loginUser(req);

    res.status(200).json(data);
  }


}
