import express from 'express';
import passport from '@root/passport';
import { config } from '@root/config';
import { SecurityController } from '@root/modules/security/controller';

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


    return this.router;
  }
}

export const securityRoute: SecurityRoute = new SecurityRoute();
