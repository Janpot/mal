import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import { Env } from './env.mjs';
import { pairwise } from './iterTools.mjs';
import { ordinal } from './stringTools.mjs';
import * as core from './core.mjs';
import * as types from './types.mjs';

const IS_RAW = process.argv[2] === '--raw';
const ARGV = process.argv.slice(IS_RAW ? 3 : 2);

function READ (input) {
  return readString(input);
}

const replEnv = new Env();
core.bindTo(replEnv);
replEnv.setValue('eval', types.createBuiltin(ast => EVAL(ast, replEnv)));
replEnv.setValue('*ARGV*', types.createList(ARGV.slice(1).map(arg => types.createString(arg))));

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

function isFunctionCall (ast, fnName = null) {
  return (
    types.isList(ast) &&
    types.isSymbol(ast.items[0]) &&
    (!fnName || (ast.items[0].name === fnName))
  );
}

function isMacroCall (ast, env) {
  if (!isFunctionCall(ast)) {
    return false;
  }
  const fnName = ast.items[0].name;
  const macro = env.getValue(fnName);
  if (!macro) {
    return false;
  }
  return macro.isMacro;
}

function macroexpand (ast, env) {
  while (isMacroCall(ast, env)) {
    const [ macroFnSymbol, ...macroArgs ] = ast.items;
    const macro = env.getValue(macroFnSymbol.name);
    ast = macro.apply(macroArgs);
  }
  return ast;
}

function quasiquote (ast) {
  if (!types.isSequential(ast) || (ast.length <= 0)) {
    return types.createList([ types.createSymbol('quote'), ast ]);
  }
  const [ first, ...rest ] = ast.items;
  if (isFunctionCall(ast, 'unquote')) {
    checkArgsLength('unquote', rest, 1, 1);
    return rest[0];
  }
  if (isFunctionCall(first, 'splice-unquote')) {
    const args = first.items.slice(1);
    checkArgsLength('unquote', args, 1, 1);
    return types.createList([ types.createSymbol('concat'), args[0], quasiquote(types.createList(rest)) ]);
  }
  return types.createList([ types.createSymbol('cons'), quasiquote(first), quasiquote(types.createList(rest)) ]);
}

function EVAL (ast, env) {
  while (true) {
    if (!ast) {
      return types.NIL;
    } else if (!types.isList(ast)) {
      return evalAst(ast, env);
    } else if (types.lengthOf(ast) <= 0) {
      return ast;
    }

    ast = macroexpand(ast, env);
    if (!types.isList(ast)) {
      return evalAst(ast, env);
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

          // TCO
          env = newEnv;
          ast = args[1];
          continue;
        }
        case 'defmacro!': {
          checkArgsLength('defmacro!', args, 2, 2);
          checkArgsTypes('defmacro!', args, [ 'symbol' ]);
          const value = EVAL(args[1], env);
          if (!types.isFunction(value)) {
            throw new Error('defmacro! expects a function declaration as second parameter');
          }
          value.isMacro = true;
          env.setValue(args[0].name, value);
          return value;
        }
        case 'macroexpand': {
          checkArgsLength('defmacro!', args, 1, 1);
          return macroexpand(args[0], env);
        }
        case 'do': {
          evalAst(types.createList(args.slice(0, -1)), env);

          // TCO
          ast = args[args.length - 1];
          continue;
        }
        case 'if': {
          checkArgsLength('if', args, 2, 3);
          const conditionResult = EVAL(args[0], env);
          if (![ types.NIL, types.FALSE ].includes(conditionResult)) {
            // TCO
            ast = args[1];
            continue;
          } else if (args.length >= 3) {
            // TCO
            ast = args[2];
            continue;
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
          const fn = types.createFunction(env, params, fnBody, (env, params, fnBody, paramValues) => {
            const newEnv = new Env(env, params, paramValues);
            if (fnBody.length <= 0) {
              return types.NIL;
            }
            const evaledArgs = fnBody.map(arg => EVAL(arg, newEnv));
            return evaledArgs[evaledArgs.length - 1];
          });
          fn.canTco = true;
          return fn;
        }
        case 'quote': {
          checkArgsLength('quote', args, 1, 1);
          return args[0];
        }
        case 'quasiquote': {
          checkArgsLength('quasiquote', args, 1, 1);

          // TCO
          ast = quasiquote(args[0]);
          continue;
        }
      }
    }

    const evaledList = evalAst(ast, env);
    const [ malFn, ...malArgs ] = types.getItems(evaledList);

    if (malFn.canTco) {
      const newEnv = new Env(malFn.env, malFn.params, malArgs);
      const firstBodyElements = malFn.fnBody.slice(0, -1);
      const lastBodyElement = malFn.fnBody[malFn.fnBody.length - 1];
      evalAst(types.createList(firstBodyElements), newEnv);

      // TCO
      env = newEnv;
      ast = lastBodyElement;
      continue;
    }

    return malFn.apply(malArgs);
  }
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
rep('(def! load-file (fn* (f) (eval (read-string (str "(do " (slurp f) ")")))))');
rep('(defmacro! cond (fn* (& xs) (if (> (count xs) 0) (list \'if (first xs) (if (> (count xs) 1) (nth xs 1) (throw "odd number of forms to cond")) (cons \'cond (rest (rest xs)))))))');
rep('(defmacro! or (fn* (& xs) (if (empty? xs) nil (if (= 1 (count xs)) (first xs) `(let* (or_FIXME ~(first xs)) (if or_FIXME or_FIXME (or ~@(rest xs))))))))');

if (ARGV.length > 0) {
  const cmd = `(load-file ${printString(types.createString(ARGV[0]), true)})`;
  rep(cmd);
} else {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: 'user> ',
    terminal: !IS_RAW
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
}
