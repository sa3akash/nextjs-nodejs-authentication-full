import fs from 'fs';
import ejs from 'ejs';

class EmailTemplates {
  public verifyEmail(url: string) {
    return ejs.render(fs.readFileSync(__dirname + '/templates/confirmEmailAddress.ejs', 'utf8'), {
      logo: 'https://a10daa94-9614-44bd-895f-977eef9b9650.b-cdn.net/e/3b5dc763-769d-4c4b-bedc-c6865f54ee32/1b29d1e8-af36-405d-8930-047e51a85e69.png',
      url: url
    });
  }
}

export const emailTemplates: EmailTemplates = new EmailTemplates();
