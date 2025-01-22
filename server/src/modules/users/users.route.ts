import express from 'express';
import { UsersController } from '@root/modules/users/users.controllers';
import passport from '@root/passport';

class UsersRoute {
  private readonly router: express.Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): express.Router {
    this.router.post('/signup', UsersController.prototype.register);
    this.router.post('/verify', UsersController.prototype.verifyEmail);
    this.router.post('/signin', UsersController.prototype.login);
    this.router.get('/google/login', passport.authenticate('google', { scope: ['email', 'profile'] }));
    this.router.get('/google/callback', passport.authenticate('google', { session: false }), UsersController.prototype.googleCallback);
    this.router.get('/github/login', passport.authenticate('github'));
    this.router.get('/github/callback', passport.authenticate('github', { session: false }), UsersController.prototype.githubCallback);
    this.router.get('/all', UsersController.prototype.getAll);
    this.router.get('/getUser', UsersController.prototype.getUser);
    this.router.post('/refresh', UsersController.prototype.refresh);

    return this.router;
  }
}

export const usersRoute: UsersRoute = new UsersRoute();
