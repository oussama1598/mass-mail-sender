import fs from 'fs';
import path from 'path';
import {
  list
} from '../services/prompt';

function readDir(dir) {
  return new Promise((resolve, reject) => {
    fs.readdir(dir, (err, result) => {
      if (err) {
        return reject(err);
      }
      return resolve(result);
    });
  });
}

function format(filename, fullpath) {
  try {
    return fs.statSync(fullpath).isDirectory() ? `${filename} (folder)` : filename;
  } catch (ex) {
    return null;
  }
}

async function fetchFolder(folder) {
  const dirs = await readDir(folder);
  const data = [{
    name: '..',
    value: path.resolve(`${folder}/..`),
    short: '..'
  }];

  const folders = [];
  const files = [];

  /* eslint-disable no-restricted-syntax */
  for (const file of dirs) {
    const fullpath = path.resolve(`${folder}/${file}`);
    const name = format(file, fullpath);

    if (name && name.includes('folder')) folders.push({
      name,
      value: fullpath,
      short: fullpath
    })

    else if(name) {
      files.push({
        name,
        value: fullpath,
        short: fullpath
      })
    }
  }

  return [...data, ...folders, ...files];

  /* eslint-enable no-restricted-syntax */
}

export default async function getFile(folder = '.', options = {}) {
  const question = options.question || 'Choose a file: '

  const files = await fetchFolder(folder);
  const selectedFile = await list(question, files);

  if (fs.statSync(selectedFile).isDirectory()) return getFile(selectedFile, options);

  return selectedFile;
}