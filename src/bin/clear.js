import serializeError from 'serialize-error';
import MailQueue from '../modules/MailQueue';
import config from '../config';
import loggerService from '../services/logger';
import { confirm } from '../services/prompt';


(async function main() {
  const {
    log,
    infoLoggingPath
  } = config.logger;
  const logger = loggerService(log, infoLoggingPath);
  const consoleLogger = loggerService(false);

  try {
    const mailQueue = new MailQueue({
      mailer: config.smtp,
      databaseURI: config.databaseURI
    });

    await mailQueue.initialize();

    const sureToClear = await confirm('Are your sure ?');

    if(!sureToClear) return consoleLogger.info('Action cancelled');

    await mailQueue.clearDatabase();

    logger.info('Databased cleared');
  } catch (e) {
    logger.error(`Something went wrong, fullError: ${JSON.stringify(serializeError(e))}`);
  }
})();