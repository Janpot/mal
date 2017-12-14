import readline from 'readline';

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

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  prompt: 'user> ',
  terminal: !process.argv.slice(2).includes('--raw')
});

rl.on('line', input => {
  const output = rep(input);
  console.log(output);
  rl.prompt();
});

rl.prompt();
