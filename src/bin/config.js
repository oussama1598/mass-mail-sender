import serializeError from 'serialize-error';
import path from 'path';
import MailQueue from '../modules/MailQueue';
import config, {
  modify
} from '../config';
import loggerService from '../services/logger';
import {
  confirm,
  input
} from '../services/prompt';
import filePicker from '../lib/filepick';


(async function main() {
  const {
    log,
    infoLoggingPath
  } = config.logger;
  const logger = loggerService(log, infoLoggingPath);

  try {
    const consoleLogger = loggerService(false);
    const mailQueue = new MailQueue({
      mailer: config.smtp,
      databaseURI: config.databaseURI
    });
    const newConfig = {
      smtp: { ...config.smtp },
      messageOptions: { ... config.messageOptions }
    }

    await mailQueue.initialize();

    const editSmtp = await confirm('Do you want to edit the smtp\'s configuration ?');

    if (editSmtp) {
      newConfig.smtp.host = await input('Smtp host: ', config.smtp.host);
      newConfig.smtp.port = await input('Smtp port:', config.smtp.port);

      if (Number.isNaN(parseInt(newConfig.smtp.port, 10))) {
        consoleLogger.error('The port should be a number');
      }

      newConfig.smtp.port = Number.isNaN(parseInt(newConfig.smtp.port, 10)) ? config.smtp.port : parseInt(newConfig.smtp.port, 10);

      newConfig.smtp.user = await input('Smtp user:', config.smtp.user);
      newConfig.smtp.pass = await input('Smtp pass:', config.smtp.pass);
    }

    const editMessageOptions = await confirm('Do you want to edit the email Options ?');

    if (editMessageOptions) {
      newConfig.messageOptions.from = await input('The email\'s from: ', config.messageOptions.from);
      newConfig.messageOptions.subject = await input('The email\'s subject: ', config.messageOptions.subject);

      newConfig.messageOptions.html = await filePicker('.', {
        question: 'The email\'s body html file uri: '
      });

      if(path.extname(newConfig.messageOptions.html) !== '.html') {
        logger.error('the only supported files for now are html');

        newConfig.messageOptions.html = config.messageOptions.html;
      }
    }

    consoleLogger.info(JSON.stringify(Object.assign(config, newConfig), null, 2));
    const shouldSave = await confirm('Does this look good to you ?');

    if (!shouldSave) return consoleLogger.info('Config modification cancelled');

    const confirmSave = await confirm('Are you sure you want to save ? (Note: if the email options got modified, the database will cleaned from the non sent emails)')

    if (!confirmSave) return consoleLogger.info('Configuration not saved');

    modify(Object.assign(config, newConfig));

    if (editMessageOptions) await mailQueue.cleanNonSent();

    logger.info('Configation saved');
  } catch (e) {
    logger.error(`Something went wrong, fullError: ${JSON.stringify(serializeError(e))}`);
  }
})();