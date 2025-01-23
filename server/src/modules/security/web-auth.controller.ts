import { auth } from '@middleware/auth';
import { Request, Response } from 'express';
import { IUserDocument } from '@root/modules/users/users.interface';
import { stringToUint8Array } from '@services/utils/common';
import {
  AuthenticationResponseJSON,
  generateAuthenticationOptions,
  GenerateAuthenticationOptionsOpts,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  WebAuthnCredential
} from '@simplewebauthn/server';
import { userModel } from '@root/modules/users/users.model';
import { ServerError } from 'error-express';
import base64url from 'base64url';
import { config } from '@root/config';

export class AuthenticationController {
  @auth()
  public async generateRegister(req: Request, res: Response) {
    const user = req.user as IUserDocument;

    // Convert user ID to Uint8Array
    const userIdArray = stringToUint8Array(user._id.toString());
    const credentials = user.webauthnDevices;

    const options = await generateRegistrationOptions({
      rpID: 'localhost',
      rpName: 'My Localhost Machine',
      userID: userIdArray,
      attestationType: 'none',
      userName: user.email,
      timeout: 30_000,
      // userDisplayName: `MA-${user.name}`,
      supportedAlgorithmIDs: [-7, -257],
      excludeCredentials: credentials.map((cred) => ({
        id: cred.id,
        type: 'public-key',
        transports: cred.transports
      })),
      authenticatorSelection: {
        userVerification: 'preferred',
        // residentKey: 'preferred',
        residentKey: 'discouraged',
        authenticatorAttachment: 'platform'
      }
    });

    // Save the challenge to the user's record
    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        challenge: options.challenge
      }
    });

    res.status(200).json(options);
  }

  @auth()
  public async verifyRegister(req: Request, res: Response) {
    const { body } = req;
    const user = req.user as IUserDocument;

    const verification = await verifyRegistrationResponse({
      expectedChallenge: user.challenge,
      expectedOrigin: `${config.CLIENT_URL}`,
      expectedRPID: 'localhost',
      response: body,
      requireUserVerification: false
    });

    // Log the verification result
    // console.log('Verification result:', verification);

    if (!verification.verified) {
      throw new ServerError('Verification failed.', 400);
    }

    // const { id, publicKey, counter, transports } = verification.registrationInfo;
    const { id, publicKey, counter, transports } = verification.registrationInfo?.credential as WebAuthnCredential;

    const existingCredential = user.webauthnDevices.some((cred) => cred.id === id);

    if (!existingCredential) {
      await userModel.findByIdAndUpdate(user._id, {
        $set: { challenge: null },
        $push: {
          webauthnDevices: { id, publicKey: base64url.encode(Buffer.from(publicKey)), counter, transports }
        }
      });
    } else {
      await userModel.findByIdAndUpdate(user._id, {
        $set: { challenge: null }
      });
    }

    res.json({ message: 'Web Auth Registration successful' });
  }

  @auth()
  public async startAuthenticate(req: Request, res: Response) {
    const user = req.user as IUserDocument;

    const opts: GenerateAuthenticationOptionsOpts = {
      timeout: 60000,
      allowCredentials: user.webauthnDevices.map((cred) => ({
        id: cred.id,
        type: 'public-key'
        // transports: cred.transports,
      })),
      userVerification: 'preferred',
      rpID: 'localhost'
    };

    const options = await generateAuthenticationOptions(opts);

    // Save the challenge to the user's record
    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        challenge: options.challenge
      }
    });

    res.status(200).json(options);
  }

  @auth()
  public async verifyAuthentication(req: Request, res: Response) {
    const body: AuthenticationResponseJSON = req.body;
    const user = req.user as IUserDocument;

    const findAuth = user.webauthnDevices.find((crud) => crud.id === body.id);

    if (!findAuth) {
      throw new ServerError('Authenticator is not registered with this site', 400);
    }

    const verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: `${user.challenge}`,
      expectedOrigin: `${config.CLIENT_URL}`,
      expectedRPID: 'localhost',
      credential: {
        id: findAuth.id,
        counter: findAuth.counter,
        transports: findAuth.transports,
        publicKey: base64url.toBuffer(findAuth.publicKey)
      },
      requireUserVerification: false
    });

    if (!verification.verified) {
      throw new ServerError('Verification failed.', 400);
    }
    // Save the challenge to the user's record
    await userModel.findByIdAndUpdate(user._id, {
      $set: {
        challenge: null
      }
    });

    res.status(200).json({
      message: 'verified'
    });
  }
}
