import dotenv from 'dotenv';

dotenv.config();

class Config {
  public PORT = process.env.PORT;
  public NODE_ENV = process.env.NODE_ENV;
  public JWT_SECRET = process.env.JWT_SECRET;
  public DATABASE_URL = process.env.DATABASE_URL;
  public CLIENT_URL = process.env.CLIENT_URL;
  public ADMIN_EMAIL = process.env.ADMIN_EMAIL;
  public SMS_EMAIL_PASS = process.env.SMS_EMAIL_PASS;
  public SMS_EMAIL = process.env.SMS_EMAIL;
  public LOGO_URL = process.env.SMS_EMAIL;

  public validateConfig(): void {
    for (const [key, value] of Object.entries(this)) {
      if (value === undefined || value === null) {
        throw new Error(`${key} env is not defined.`);
      }
    }
  }
}

export const config: Config = new Config();
