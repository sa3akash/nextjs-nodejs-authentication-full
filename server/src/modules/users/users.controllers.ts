import { Request, Response } from 'express';
import { joiValidation } from '@middleware/joiValidation';
import { SignInSchema, SignUpSchema } from '@root/modules/users/users.schema';
import { usersService } from '@services/db/users.service';
import { ServerError } from 'error-express';
import { auth } from '@middleware/auth';
import { userModel } from '@root/modules/users/users.model';

export class UsersController {
  @joiValidation(SignUpSchema)
  public async register(req: Request, res: Response) {

    await usersService.addUser(req.body);

    res.status(201).json({
      status: 'success',
      message: 'Check your email address for verify your account.'
    });
  }

  public async verifyEmail(req: Request, res: Response) {
    const { token } = req.body;
    if (!token) throw new ServerError('Token is required', 404);
    await usersService.verifyEmailAddress(token);
    res.status(200).json({
      status: 'success',
      message: 'Your email successfully verified'
    });
  }

  @joiValidation(SignInSchema)
  public async login(req: Request, res: Response) {
    const data = await usersService.loginUser(req);
    console.log(data);

    res.status(200).json(data);

  }

  public async googleCallback(req: Request, res: Response){

    console.log('google user',req.user);


    res.json({ message: 'ok'});
  }

  @auth()
  public async getAll(req:Request,res:Response){
    const all = await userModel.find();
    res.json(all);
  }

  @auth()
  public async getUser(req: Request, res: Response) {
    const data = await usersService.getUserById(`${(req.user as any)?._id}`);

    res.status(200).json(data);

  }

  @auth()
  public async refresh(req: Request, res: Response) {
    const {token} = req.body;
    if(!token){
      throw new ServerError('Token is required', 400);
    }
    const data = await usersService.refreshTokenGenerate(token);

    res.status(200).json(data);

  }

}
