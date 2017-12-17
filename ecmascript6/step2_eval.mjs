import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import * as types from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = {
  '+': types.createBuiltin((a, b) => types.createNumber(a.value + b.value)),
  '-': types.createBuiltin((a, b) => types.createNumber(a.value - b.value)),
  '*': types.createBuiltin((a, b) => types.createNumber(a.value * b.value)),
  '/': types.createBuiltin((a, b) => types.createNumber(a.value / b.value))
};

function evalAst (ast, env) {
  if (types.isList(ast)) {
    return types.createList(ast.items.map(item => EVAL(item, env)));
  } else if (types.isVector(ast)) {
    return types.createVector(ast.items.map(item => EVAL(item, env)));
  } else if (types.isHashMap(ast)) {
    const evaluatedEntries = Array.from(ast.items.entries())
      .map(([ key, value ]) => [ EVAL(key, env), EVAL(value, env) ]);
    return types.createHashMap(new Map(evaluatedEntries));
  } else if (types.isSymbol(ast)) {
    if (env[ast.name]) {
      return env[ast.name];
    }
    throw new Error(`Unknown symbol "${ast.name}"`);
  } else {
    return ast;
  }
}

function EVAL (ast, env) {
  if (!ast) {
    return types.NIL;
  } else if (!types.isList(ast)) {
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
