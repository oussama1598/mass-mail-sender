import flavors from 'flavors';
import path from 'path';
import fs from 'fs';

const CWD = path.join(__dirname, '..');
const CONFIG_FILE = 'config.json';
const CONFIG_DIR = path.join(CWD, 'config');
const CONFIG_FULL_PATH = path.join(CONFIG_DIR, CONFIG_FILE);
const defaultOptions = {
  logger: {
    log: true,
    infoLoggingPath: path.join(__dirname, '../../log.log')
  },
  smtp: {
    host: 'smpt.test.com',
    port: '587',
    user: 'username',
    pass: 'password',
  },
  messageOptions: {
    from: '"tes" <test@test.com>',
    subject: 'test',
    html: null,
  },
  databaseURI: path.join(__dirname, '../../database.json'),
};

function writeToConfig(conf) {
  fs.writeFileSync(
    CONFIG_FULL_PATH,
    JSON.stringify(conf, null, '  '),
    'utf8'
  );
} 

if (!fs.existsSync(CONFIG_FULL_PATH)) writeToConfig(defaultOptions);

export default flavors('config', {
  workingDir: CWD
});

export function modify(newConfig) {
  writeToConfig(newConfig);
}