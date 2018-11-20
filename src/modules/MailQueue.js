import Queue from 'better-queue';
import {
  EventEmitter
} from 'events';
import parse from 'csv-parse';
import fs from 'fs';
import serializeError from 'serialize-error';
import Mailer from './Mailer';
import MailDatabase from './MailDatabase';

export default class MailQueue extends EventEmitter {
  constructor(options) {
    super();

    this.options = Object.assign({
      delay: false,
      delayFor: 4000,
      retry: true,
      maxTries: 2,
      retryDelay: 4000,
      autoRemove: true
    }, options);

    const {
      delay,
      delayFor,
      retry,
      maxTries,
      retryDelay,
      databaseURI,
    } = this.options;
    const {
      host,
      port,
      user,
      pass
    } = this.options.mailer;
    this.queue = new Queue(this.sendMail.bind(this), {
      maxRetries: retry ? maxTries : 0,
      retryDelay,
      afterProcessDelay: delay ? delayFor : 0
    });
    this.mailDatabase = new MailDatabase(databaseURI);
    this.Mailer = new Mailer(host, port, user, pass);

    this.messageOptions = {
      from: null,
      to: null,
      subject: null,
      html: null,
    }

    this.emit('info', 'Waiting for the queue to initialize');

    this.queue.on('task_finish', () => this.emit('queue_moved', this.getStats()));
    this.queue.on('drain', () => this.emit('queue_done', this.getStats()));
  }

  async initialize() {
    this.emit('info', 'Waiting for the queue to initialize');
    this.queue.pause();

    await new Promise(resolve => {
      this.mailDatabase.once('database_ready', () => resolve());
    })

    this.emit('info', 'Database Loaded successfly');

    await this.cleanDatabaseFromTries();

    this.emit('info', 'The Queue is ready');
  }

  setMessageOptions(from, subject) {
    this.messageOptions = Object.assign(this.messageOptions, {
      from,
      subject
    });

    this.emit('info', 'Message options has been updated');
  }

  setMessageHtml(html) {
    this.messageOptions = Object.assign(this.messageOptions, {
      html
    });

    this.emit('info', 'Message HTML has been updated');
  }

  async sendMail(email, cb) {
    this.emit('info', `console: Sending to ${email}`);
    try {
      await this.Mailer.send(Object.assign(this.messageOptions, {
        to: email
      }));

      this.emit('info', `console: Email sent to ${email}`);
      this.mailDatabase.emailParsed(email, true);

      cb(null);
    } catch (e) {
      this.emit('error', `Couldn't send to ${email}, reason: ${e.message}, fullError: ${JSON.stringify(serializeError(e))}`);

      this.mailDatabase.emailParsed(email, false);
      cb(e);
    }
  }

  loadFromCsv(csvURI) {
    this.emit('info', `Loading data from csv file (${csvURI})`);

    return new Promise(resolve => {
      const fileStream = fs.createReadStream(csvURI);
      const parser = parse({
        delimiter: ','
      });
      const output = [];

      fileStream.pipe(parser);

      parser.on('readable', () => {
        let record;
        while (record = parser.read()) {
          output.push(record);
        }
      })

      parser.on('end', async () => {
        this.emit('info', `Loaded ${output.length} email(s) from the csv file`);

        /* eslint-disable no-restricted-syntax, no-await-in-loop */
        for(const emailData of output){
          await this.addEmail(emailData[3]);
        }
        /* eslint-enable no-restricted-syntax, no-await-in-loop */
        resolve();
      })
    });
  }

  async addEmail(email, addToDatabase = true) {
    const added = addToDatabase ? await this.mailDatabase.addEmail(email): true;

    if(added) return this.queue.push(email);

    return this.emit('info', `Either you added this email "${email}" twice or it did already receive this mail. Otherwise try and clean the database`);
  }

  getAllNonSentEmails(){
    return this.mailDatabase.getAllNonSentEmails(this.options.maxTries);
  }

  async isRecoverable() {
    const emailsItems = await this.getAllNonSentEmails();

    return emailsItems.length > 0;
  }

  async recoverFromDatabase() {
    const emailsItems = this.getAllNonSentEmails();

    this.emit('info', `Recovering from the last session (${emailsItems.length})`);

    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for(const emailItem of emailsItems) {
      await this.addEmail(emailItem.email, false);
    }
    /* eslint-enable no-restricted-syntax, no-await-in-loop */
  }

  async cleanDatabaseFromTries() {
    const emailsItems = this.mailDatabase.getExecededTriesEmails(this.options.maxTries);

    if(emailsItems.length > 0) this.emit('info', `Cleaning ${emailsItems.length} of the emails that execeded the max tries (${this.options.maxTries})`);

    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for(const emailItem of emailsItems) {
      await this.mailDatabase.removeEmail(emailItem.email);
    }
    /* eslint-enable no-restricted-syntax, no-await-in-loop */
  }

  async cleanNonSent(){
    const emailsItems = this.mailDatabase.getAllNonSentEmails(2);

    if(emailsItems.length > 0) this.emit('info', `Removing all non sent emails from database (${emailsItems.length})`);
    /* eslint-disable no-restricted-syntax, no-await-in-loop */
    for(const emailItem of emailsItems) {
      await this.mailDatabase.removeEmail(emailItem.email);
    }
    /* eslint-enable no-restricted-syntax, no-await-in-loop */
  }

  clearDatabase() {
    this.mailDatabase.clearDatabase();
  }

  pause() {
    this.queue.pause();
  }

  resume() {
    this.queue.resume();
  }

  start() {
    const stats = this.getStats();

    if(stats.totalItems > 0) this.emit('info', `Sending ${stats.totalItems} email(s)`);
    else this.emit('info', 'Nothing to send, the queue is empty');

    this.resume();
  }

  getStats() {
    const emailsItems = this.mailDatabase.getAllNonSentEmails(2);
    const stats = this.queue.getStats();

    return {
      totalItems: emailsItems.length,
      ...stats
    }
  }
}