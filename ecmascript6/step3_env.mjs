import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import { Env } from './env.mjs';
import { pairwise } from './iterTools.mjs';
import { ordinal } from './stringTools.mjs';
import * as types from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = new Env();
replEnv.setValue('+', types.createBuiltin((a, b) => types.createNumber(a.value + b.value)));
replEnv.setValue('-', types.createBuiltin((a, b) => types.createNumber(a.value - b.value)));
replEnv.setValue('*', types.createBuiltin((a, b) => types.createNumber(a.value * b.value)));
replEnv.setValue('/', types.createBuiltin((a, b) => types.createNumber(a.value / b.value)));

function checkArgsLength (fnName, args, lower = -Infinity, upper = +Infinity) {
  if (args.length < lower) {
    throw new Error(`Too few arguments to ${fnName}`);
  } else if (args.length > upper) {
    throw new Error(`Too many arguments to ${fnName}`);
  }
}

const typeCheckMap = Object.assign(Object.create(null), {
  symbol: types.isSymbol
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
    switch (func.name) {
      case 'def!': {
        checkArgsLength('def!', args, 2, 2);
        checkArgsTypes('def!', args, [ 'symbol' ]);
        const value = EVAL(args[1], env);
        env.setValue(args[0].name, value);
        return value;
      }
      case 'let*': {
        if (!types.isSequential(args[0])) {
          throw new Error('Bad binding form, expected vector');
        } else if (args[0].length % 2 !== 0) {
          throw new Error('let! requires an even number of forms in binding vector');
        }
        const newEnv = new Env(env);
        for (const [ symbol, expression ] of pairwise(args[0].items)) {
          if (!(types.isSymbol(symbol))) {
            throw new Error('Bad binding form, expected symbol');
          }
          const value = EVAL(expression, newEnv);
          newEnv.setValue(symbol.name, value);
        }
        return EVAL(args[1], newEnv);
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
