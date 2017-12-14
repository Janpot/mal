import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';

import {
  MalList,
  MalSymbol,
  MalNumber,
  MalVector,
  MalHashMap
} from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = {
  '+': (a, b) => new MalNumber(a.value + b.value),
  '-': (a, b) => new MalNumber(a.value - b.value),
  '*': (a, b) => new MalNumber(a.value * b.value),
  '/': (a, b) => new MalNumber(a.value / b.value)
};

function evalAst (ast, env) {
  switch (ast.constructor) {
    case MalList:
      if (ast.items.length <= 0) {
        return ast;
      }
      const evaledItems = ast.items.map(item => EVAL(item, env));
      return evaledItems[0](...evaledItems.slice(1));
    case MalSymbol:
      if (replEnv[ast.name]) {
        return replEnv[ast.name];
      }
      throw new Error(`Unknown symbol "${ast.name}"`);
    case MalVector:
      return new MalVector(ast.items.map(item => EVAL(item, env)));
    case MalHashMap:
      const evaluatedEntries = Array.from(ast.items.entries())
        .map(([ key, value ]) => [ EVAL(key, env), EVAL(value, env) ]);
      return new MalHashMap(new Map(evaluatedEntries));
    default:
      return ast;
  }
}

function EVAL (ast, env) {
  if (!ast) {
    return ast;
  }

  return evalAst(ast, env);
}

function PRINT (output) {
  if (!output) {
    return output;
  }
  return printString(output, true);
}

function rep (input) {
  return PRINT(EVAL(READ(input), replEnv));
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
