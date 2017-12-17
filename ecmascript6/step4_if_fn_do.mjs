import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import { Env } from './env.mjs';
import { pairwise } from './iterTools.mjs';
import { ordinal } from './stringTools.mjs';
import * as core from './core.mjs';
import * as types from './types.mjs';

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

const typeCheckMap = Object.assign(Object.create(null), {
  symbol: types.isSymbol,
  sequential: types.isSequential
});

function checkArgsTypes (fnName, args, types = []) {
  for (let i = 0; i < Math.min(types.length, args.length); i += 1) {
    const type = types[i];
    const typeCheck = typeCheckMap[type];
    if (!typeCheck(args[i])) {
      throw new Error(`${ordinal(i + 1)} argument to ${fnName} must be a ${type}`);
    }
  }
}

function evalAst (ast, env) {
  if (types.isList(ast)) {
    return types.createList(types.getItems(ast).map(item => EVAL(item, env)));
  } else if (types.isVector(ast)) {
    return types.createVector(types.getItems(ast).map(item => EVAL(item, env)));
  } else if (types.isHashMap(ast)) {
    const evaluatedEntries = Array.from(types.getItems(ast).entries())
      .map(([ key, value ]) => [ EVAL(key, env), EVAL(value, env) ]);
    return types.createHashMap(new Map(evaluatedEntries));
  } else if (types.isSymbol(ast)) {
    const value = env.getValue(ast.name);
    if (!value) {
      throw new Error(`'${ast.name}' not found`);
    }
    return value;
  } else {
    return ast;
  }
}

function EVAL (ast, env) {
  if (!ast) {
    return types.NIL;
  } else if (!types.isList(ast)) {
    return evalAst(ast, env);
  } else if (types.lengthOf(ast) <= 0) {
    return ast;
  }

  const [ func, ...args ] = ast.items;
  if (types.isSymbol(func)) {
    switch (types.getSymbolName(func)) {
      case 'def!': {
        checkArgsLength('def!', args, 2, 2);
        checkArgsTypes('def!', args, [ 'symbol' ]);
        const value = EVAL(args[1], env);
        env.setValue(types.getSymbolName(args[0]), value);
        return value;
      }
      case 'let*': {
        if (!types.isSequential(args[0])) {
          throw new Error('Bad binding form, expected vector');
        } else if (types.lengthOf(args[0]) % 2 !== 0) {
          throw new Error('let! requires an even number of forms in binding vector');
        }
        const newEnv = new Env(env);
        for (const [ symbol, expression ] of pairwise(types.getItems(args[0]))) {
          if (!types.isSymbol(symbol)) {
            throw new Error('Bad binding form, expected symbol');
          }
          const value = EVAL(expression, newEnv);
          newEnv.setValue(types.getSymbolName(symbol), value);
        }
        return EVAL(args[1], newEnv);
      }
      case 'do': {
        const evaledArgs = evalAst(types.createList(args), env);
        return evaledArgs.items[evaledArgs.length - 1];
      }
      case 'if': {
        checkArgsLength('if', args, 2, 3);
        const conditionResult = EVAL(args[0], env);
        if (![ types.NIL, types.FALSE ].includes(conditionResult)) {
          return EVAL(args[1], env);
        } else if (args.length >= 3) {
          return EVAL(args[2], env);
        } else {
          return types.NIL;
        }
      }
      case 'fn*': {
        checkArgsLength('fn*', args, 1, +Infinity);
        checkArgsTypes('fn*', args, [ 'sequential' ]);
        const [ paramDecl, ...fnBody ] = args;
        const params = paramDecl.items.map(bind => {
          if (!types.isSymbol(bind)) {
            throw new Error(`fn params must be Symbols`);
          }
          return bind.name;
        });
        return types.createFunction(env, params, fnBody, (env, params, fnBody, paramValues) => {
          const newEnv = new Env(env, params, paramValues);
          if (fnBody.length <= 0) {
            return types.NIL;
          }
          const evaledArgs = fnBody.map(arg => EVAL(arg, newEnv));
          return evaledArgs[evaledArgs.length - 1];
        });
      }
    }
  }

  const evaledList = evalAst(ast, env);
  const [ malFn, ...malArgs ] = types.getItems(evaledList);
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
