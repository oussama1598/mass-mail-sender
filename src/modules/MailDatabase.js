import Loki from 'lokijs';
import {
  EventEmitter
} from 'events';

export default class MailDatabase extends EventEmitter {
  constructor(databaseURI) {
    super();

    this.db = new Loki(databaseURI, {
      autoload: true,
      autoloadCallback: this.databaseReady.bind(this)
    });
  }

  databaseReady() {
    this.emails = this.db.getCollection('emails') || this.db.addCollection('emails');

    this.emit('database_ready')
  }

  findEmail(email) {
    return this.emails.findOne({
      email: email.toLowerCase()
    });
  }

  async addEmail(email) {
    const result = this.findEmail(email);

    if (result) return false;

    this.emails.insert({
      email,
      tries: 0,
      sent: false
    });

    await this.saveDatabase();

    return true;
  }

  async removeEmail(email) {
    this.emails.findAndRemove({
      email
    });

    return this.saveDatabase();
  }

  getExecededTriesEmails(tries) {
    return this.emails.find({
      sent: false,
      tries: {
        '$gte': tries
      }
    })
  }

  getAllNonSentEmails(tries) {
    return this.emails.find({
      sent: false,
      tries: {
        '$lt': tries
      }
    });
  }

  emailParsed(email, sent = true) {
    const result = this.findEmail(email);

    result.sent = sent;

    if (!sent) result.tries += 1;

    this.emails.update(result);

    return this.saveDatabase();
  }

  clearDatabase() {
    this.emails.clear();

    return this.saveDatabase();
  }

  saveDatabase() {
    return new Promise((resolve, reject) => {
      this.db.saveDatabase(err => {
        if (err) return reject(err);

        return resolve();
      })
    })
  }
}