import dotenv from 'dotenv';

dotenv.config();

class Config {
  public PORT = process.env.PORT;
  public NODE_ENV = process.env.NODE_ENV;
  public JWT_SECRET = process.env.JWT_SECRET;
  public JWT_SECRET_REFRESH = process.env.JWT_SECRET_REFRESH;
  public DATABASE_URL = process.env.DATABASE_URL;
  public CLIENT_URL = process.env.CLIENT_URL;
  public ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  public LOGO_URL = process.env.LOGO_URL;
  public SENDER_EMAIL_HOST = process.env.SENDER_EMAIL_HOST;
  public SENDER_EMAIL_PORT = process.env.SENDER_EMAIL_PORT;
  public SENDER_EMAIL = process.env.SENDER_EMAIL;
  public SENDER_EMAIL_PASSWORD = process.env.SENDER_EMAIL_PASSWORD;
  public REDIS_URL = process.env.REDIS_URL;

  public validateConfig(): void {
    for (const [key, value] of Object.entries(this)) {
      if (value === undefined || value === null) {
        throw new Error(`${key} env is not defined.`);
      }
    }
  }
}

export const config: Config = new Config();
