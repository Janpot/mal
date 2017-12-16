import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';

import {
  MalList,
  MalSymbol,
  MalNumber,
  MalVector,
  MalHashMap,
  MalFunction,
  MAL_NIL
} from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = {
  '+': MalFunction.builtin((a, b) => new MalNumber(a.value + b.value)),
  '-': MalFunction.builtin((a, b) => new MalNumber(a.value - b.value)),
  '*': MalFunction.builtin((a, b) => new MalNumber(a.value * b.value)),
  '/': MalFunction.builtin((a, b) => new MalNumber(a.value / b.value))
};

function evalAst (ast, env) {
  switch (ast.constructor) {
    case MalList:
      return new MalList(ast.items.map(item => EVAL(item, env)));
    case MalVector:
      return new MalVector(ast.items.map(item => EVAL(item, env)));
    case MalSymbol:
      if (env[ast.name]) {
        return env[ast.name];
      }
      throw new Error(`Unknown symbol "${ast.name}"`);
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
    return MAL_NIL;
  } else if (!(ast instanceof MalList)) {
    return evalAst(ast, env);
  } else if (ast.length <= 0) {
    return ast;
  }

  const [ malFn, ...malArgs ] = evalAst(ast, env).items;
  return malFn.apply(malArgs);
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
