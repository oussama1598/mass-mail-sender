import nodemailer from 'nodemailer';

export default class Mailer{
  constructor(host, port, user, pass, secure = false) {
    this.transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: {user, pass}
    })
  }  

  send (messageOptions = {}) {
    return new Promise((resolve, reject) => {
      this.transporter.sendMail(messageOptions, (err, info) => {
        if(err) return reject(err);

        return resolve(info);
      })
    });
  }
}