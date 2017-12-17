import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import { Env } from './env.mjs';
import { pairwise } from './iterTools.mjs';
import { ordinal } from './stringTools.mjs';
import * as core from './core.mjs';

import {
  MalList,
  MalSymbol,
  MalVector,
  MalHashMap,
  MalFunction,
  MAL_NIL,
  MAL_FALSE
} from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = new Env();
core.bindTo(replEnv);

function checkArgsLength (fnName, args, lower = -Infinity, upper = +Infinity) {
  if (args.length < lower) {
    throw new Error(`Too few arguments to ${fnName}`);
  } else if (args.length > upper) {
    throw new Error(`Too many arguments to ${fnName}`);
  }
}

function checkArgsTypes (fnName, args, types = []) {
  for (let i = 0; i < Math.min(types.length, args.length); i += 1) {
    const oneOfType = Array.isArray(types[i]) ? types[i] : [ types[i] ];
    if (!oneOfType.includes(args[i].constructor)) {
      const typeStr = oneOfType.map(type => type.name).join(' or a ');
      throw new Error(`${ordinal(i + 1)} argument to ${fnName} must be a ${typeStr}`);
    }
  }
}

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
        checkArgsLength('def!', args, 2, 2);
        checkArgsTypes('def!', args, [ MalSymbol ]);
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
      case 'do':
        const evaledArgs = evalAst(new MalList(args), env);
        return evaledArgs.items[evaledArgs.length - 1];
      case 'if':
        checkArgsLength('if', args, 2, 3);
        const conditionResult = EVAL(args[0], env);
        if (![ MAL_NIL, MAL_FALSE ].includes(conditionResult)) {
          return EVAL(args[1], env);
        } else if (args.length >= 3) {
          return EVAL(args[2], env);
        } else {
          return MAL_NIL;
        }
      case 'fn*':
        checkArgsLength('fn*', args, 1, +Infinity);
        checkArgsTypes('fn*', args, [ [ MalList, MalVector ] ]);
        const [ paramDecl, ...fnBody ] = args;
        const params = paramDecl.items.map(bind => {
          if (!(bind instanceof MalSymbol)) {
            throw new Error(`fn params must be Symbols`);
          }
          return bind.name;
        });
        return new MalFunction(env, params, fnBody, (env, params, fnBody, paramValues) => {
          const newEnv = new Env(env, params, paramValues);
          if (fnBody.length <= 0) {
            return MAL_NIL;
          }
          const evaledArgs = fnBody.map(arg => EVAL(arg, newEnv));
          return evaledArgs[evaledArgs.length - 1];
        });
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

rep('(def! not (fn* (a) (if a false true)))');

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
