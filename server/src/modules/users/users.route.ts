import express from 'express';
import {UsersController} from "@root/modules/users/users.controllers";

class UsersRoute {
  private readonly router: express.Router;
  constructor() {
    this.router = express.Router();
  }

  public routes(): express.Router {
    this.router.post('/register', UsersController.prototype.register);
    this.router.post('/register', UsersController.prototype.login);

    return this.router;
  }
}

export const usersRoute: UsersRoute = new UsersRoute();
