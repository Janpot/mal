import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';

function READ (input) {
  return readString(input);
}

function EVAL (input) {
  return input;
}

function PRINT (input) {
  if (input) {
    return printString(input, true);
  }
  return null;
}

function rep (input) {
  return PRINT(EVAL(READ(input)));
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'user> ',
  terminal: !process.argv.slice(2).includes('--raw')
});

rl.on('line', input => {
  try {
    const output = rep(input);
    if (output) {
      console.log(output);
    }
  } catch (error) {
    console.error(error);
  }
  rl.prompt();
});

rl.prompt();
