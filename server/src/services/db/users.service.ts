import {IUserDocument} from "@root/modules/users/users.interface";
import {userModel} from "@root/modules/users/users.model";
import {ServerError} from "error-express";


class UsersService {
  public async getUserById(id: string): Promise<IUserDocument | null> {
    return userModel.findById(id);
  }

  public async getUserByEmail(email: string): Promise<IUserDocument | null> {
    return userModel.findOne({
      email: email
    });
  }

  public async addUser(data: {email: string, password: string, name:string}): Promise<void> {
    const user = await this.getUserByEmail(data.email);
    if (user) throw new ServerError('User already exists', 400);
    const newUser = await userModel.create(data);

  }
}

export const adminService = new UsersService();
