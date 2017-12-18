import { prompt } from './readline.mjs';
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

while (true) {
  const input = prompt('user> ');
  try {
    const output = rep(input);
    if (output) {
      console.log(output);
    }
  } catch (error) {
    console.error(error);
  }
}
