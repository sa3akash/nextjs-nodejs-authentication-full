import { Application } from 'express';
import { usersRoute } from '@root/modules/users/users.route';
import { securityRoute } from '@root/modules/security/route';

export default (app: Application) => {
  const routes = () => {
    app.use('/api/v1/auth', usersRoute.routes());
    app.use('/api/v1/security', securityRoute.routes());
  };

  routes();
};
