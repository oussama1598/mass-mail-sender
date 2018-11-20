import inquirer from 'inquirer';

async function prompt(type, message, defaultValue, choices = null) {
  const prompt = await inquirer.prompt([{
    type,
    name: 'answer',
    message,
    choices,
    default: defaultValue
  }]);

  return prompt.answer;
}

export function confirm(message) {
  return prompt('confirm', message);
}

export function input(message, defaultValue) {
  return prompt('input', message, defaultValue);
}

export function list(message, choices) {
  return prompt('list', message, null, choices);
}