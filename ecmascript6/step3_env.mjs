import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import { Env } from './env.mjs';
import { pairwise } from './iterTools.mjs';

import {
  MalList,
  MalSymbol,
  MalNumber,
  MalVector,
  MalHashMap,
  MalFunction,
  MalNil
} from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = new Env();
replEnv.setValue('+', new MalFunction((a, b) => new MalNumber(a.value + b.value)));
replEnv.setValue('-', new MalFunction((a, b) => new MalNumber(a.value - b.value)));
replEnv.setValue('*', new MalFunction((a, b) => new MalNumber(a.value * b.value)));
replEnv.setValue('/', new MalFunction((a, b) => new MalNumber(a.value / b.value)));

function evalAst (ast, env) {
  switch (ast.constructor) {
    case MalList:
      return new MalList(ast.items.map(item => EVAL(item, env)));
    case MalSymbol:
      const value = env.getValue(ast.name);
      if (!value) {
        throw new Error(`Unknown symbol "${ast.name}"`);
      }
      return value;
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
    return new MalNil();
  }

  if (ast.constructor === MalList && ast.items.length > 0) {
    if (ast.items[0] instanceof MalSymbol) {
      switch (ast.items[0].name) {
        case 'def!':
          if (ast.length < 3) {
            throw new Error('Too few arguments to def!');
          } else if (ast.length > 3) {
            throw new Error('Too many arguments to def!');
          } else if (!(ast.items[1] instanceof MalSymbol)) {
            throw new Error('First argument to def! must be a Symbol');
          }
          const value = EVAL(ast.items[2], env);
          env.setValue(ast.items[1].name, value);
          return value;
        case 'let*':
          if (!(ast.items[1] instanceof MalList || ast.items[1] instanceof MalVector)) {
            throw new Error('Bad binding form, expected vector');
          } else if (ast.items[1].length % 2 !== 0) {
            throw new Error('let! requires an even number of forms in binding vector');
          }
          const newEnv = new Env(env);
          Array.from(pairwise(ast.items[1].items))
            .forEach(([ symbol, expression ]) => {
              if (!(symbol instanceof MalSymbol)) {
                throw new Error('Bad binding form, expected symbol');
              }
              const value = EVAL(expression, newEnv);
              newEnv.setValue(symbol.name, value);
            });
          return EVAL(ast.items[2], newEnv);
      }
    }
    const [ malFn, ...malArgs ] = evalAst(ast, env).items;
    return malFn.apply(null, malArgs);
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
