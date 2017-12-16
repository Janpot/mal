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
  MAL_NIL
} from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = new Env();
replEnv.setValue('+', MalFunction.builtin((a, b) => new MalNumber(a.value + b.value)));
replEnv.setValue('-', MalFunction.builtin((a, b) => new MalNumber(a.value - b.value)));
replEnv.setValue('*', MalFunction.builtin((a, b) => new MalNumber(a.value * b.value)));
replEnv.setValue('/', MalFunction.builtin((a, b) => new MalNumber(a.value / b.value)));

function evalAst (ast, env) {
  switch (ast.constructor) {
    case MalList:
      return new MalList(ast.items.map(item => EVAL(item, env)));
    case MalVector:
      return new MalVector(ast.items.map(item => EVAL(item, env)));
    case MalSymbol:
      const value = env.getValue(ast.name);
      if (!value) {
        throw new Error(`Unable to resolve symbol: ${ast.name} in this context`);
      }
      return value;
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

  const [ func, ...args ] = ast.items;
  if (func instanceof MalSymbol) {
    switch (func.name) {
      case 'def!':
        if (args.length < 2) {
          throw new Error('Too few arguments to def!');
        } else if (args.length > 2) {
          throw new Error('Too many arguments to def!');
        } else if (!(args[0] instanceof MalSymbol)) {
          throw new Error('First argument to def! must be a Symbol');
        }
        const value = EVAL(args[1], env);
        env.setValue(args[0].name, value);
        return value;
      case 'let*':
        if (!(args[0] instanceof MalList || args[0] instanceof MalVector)) {
          throw new Error('Bad binding form, expected vector');
        } else if (args[0].length % 2 !== 0) {
          throw new Error('let! requires an even number of forms in binding vector');
        }
        const newEnv = new Env(env);
        for (const [ symbol, expression ] of pairwise(args[0].items)) {
          if (!(symbol instanceof MalSymbol)) {
            throw new Error('Bad binding form, expected symbol');
          }
          const value = EVAL(expression, newEnv);
          newEnv.setValue(symbol.name, value);
        }
        return EVAL(args[1], newEnv);
    }
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
