import program from 'commander';
import send from './send';

import {
  version
} from '../../package.json';

/* eslint-disable global-require */

program
  .version(version)

program
  .command('send <csv>')
  .description('Send the emails, using a csv file.')
  .action(csvURI => {
    send(csvURI)
  })

program
  .command('config')
  .description('Edit/add configuration.')
  .action(() => {
    require('./config');
  })

program
  .command('clear')
  .description('Clear the database entirely.')
  .action(() => {
    require('./clear');
  })

program.parse(process.argv);