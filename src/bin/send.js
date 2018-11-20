import serializeError from 'serialize-error';
import fs from 'fs';
import path from 'path';
import config from '../config';
import MailQueue from '../modules/MailQueue';
import loggerService from '../services/logger';
import {
  confirm
} from '../services/prompt';

// TODO: add clear database command

export default async function main(nonResolvedCsvURI) {
  const csvURI = path.resolve(process.cwd(), nonResolvedCsvURI);

  const {
    log,
    infoLoggingPath
  } = config.logger;
  const {
    from,
    subject
  } = config.messageOptions;
  const logger = loggerService(log, infoLoggingPath);
  const consoleLogger = loggerService(false);

  if(!fs.existsSync(csvURI)) return logger.error(`The provided csv file does not exist, ${csvURI}`);
  if(!fs.existsSync(config.messageOptions.html)) return logger.error(`The html file provided does not exist, ${config.messageOptions.html}`);

  try {
    const mailQueue = new MailQueue({
      mailer: config.smtp,
      databaseURI: config.databaseURI,
    });

    mailQueue.on('info', message => {
      if(message.includes('console: ')) return consoleLogger.info(message.replace('console: ', ''));

      return logger.info(message);
    });
    mailQueue.on('error', message => logger.error(message));

    mailQueue.on('queue_moved', stats => {
      consoleLogger.info(`${stats.total} sent`);
    })

    mailQueue.on('queue_done', stats => {
      if(stats.totalItems === 0) consoleLogger.info('The queue got emptied.');
    })

    await mailQueue.initialize();

    const isRecoverable = await mailQueue.isRecoverable();

    if (isRecoverable) {
      const answer = await confirm('Do you want to continue your last session ?');

      if (answer) await mailQueue.recoverFromDatabase();
      else await mailQueue.cleanNonSent();
    }

    mailQueue.setMessageOptions(from, subject);
    mailQueue.setMessageHtml(fs.readFileSync(config.messageOptions.html));

    await mailQueue.loadFromCsv(csvURI);

    mailQueue.start();
  } catch (e) {
    logger.error(`Something went wrong, fullError: ${JSON.stringify(serializeError(e))}`);
  }
}