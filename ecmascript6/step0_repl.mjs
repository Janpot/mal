import { prompt } from './readline.mjs';

function READ (input) {
  return input;
}

function EVAL (input) {
  return input;
}

function PRINT (input) {
  return input;
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
