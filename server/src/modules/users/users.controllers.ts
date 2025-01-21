import {Request, Response} from "express";
import {joiValidation} from "@middleware/joiValidation";
import {SignUpSchema} from "@root/modules/users/users.schema";

export class UsersController {
    @joiValidation(SignUpSchema)
    public async register(req: Request, res: Response) {
        const { name, email, password } = req.body;

        res.status(201).send({})
    }

    public async login(req: Request, res: Response) {
        const { name, email, password } = req.body;

        res.status(201).send({})
    }
}