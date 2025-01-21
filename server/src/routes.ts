import { Application } from 'express';
import {usersRoute} from "@root/modules/users/users.route";


export default (app: Application) => {
  const routes = () => {
    app.use('/api/v1/auth', usersRoute.routes());
  };

  routes();
};
