import express from 'express';
import passport from '@root/passport';
import { config } from '@root/config';
import { SecurityController } from '@root/modules/security/controller';
import { AuthenticationController } from '@root/modules/security/web-auth.controller';

class SecurityRoute {
  private readonly router: express.Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): express.Router {
    this.router.get('/generate', SecurityController.prototype.generate);
    this.router.post('/verify', SecurityController.prototype.verify);
    this.router.post('/off', SecurityController.prototype.twoFaOff);
    this.router.post('/twoFaLogin', SecurityController.prototype.twoFaLogin);
    this.router.get('/generateRegister', AuthenticationController.prototype.generateRegister);
    this.router.post('/verifyRegister', AuthenticationController.prototype.verifyRegister);
    this.router.get('/startAuthenticate', AuthenticationController.prototype.startAuthenticate);
    this.router.post('/verifyAuthenticate', AuthenticationController.prototype.verifyAuthentication);


    return this.router;
  }
}

export const securityRoute: SecurityRoute = new SecurityRoute();
