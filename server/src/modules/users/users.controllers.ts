import {Request, Response} from "express";

export class UsersController {
    public async register(req: Request, res: Response) {
        const { name, email, password } = req.body;

        res.status(201).send({})
    }

    public async login(req: Request, res: Response) {
        const { name, email, password } = req.body;

        res.status(201).send({})
    }
}