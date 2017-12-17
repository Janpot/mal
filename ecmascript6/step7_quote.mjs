import readline from 'readline';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import { Env } from './env.mjs';
import { pairwise } from './iterTools.mjs';
import * as core from './core.mjs';

import {
  MalList,
  MalSymbol,
  MalVector,
  MalHashMap,
  MalFunction,
  MalString,
  MAL_NIL,
  MAL_FALSE
} from './types.mjs';

const IS_RAW = process.argv[2] === '--raw';
const MAL_ARGV = process.argv.slice(IS_RAW ? 3 : 2);

function READ (input) {
  return readString(input);
}

const replEnv = new Env();
core.bindTo(replEnv);
replEnv.setValue('eval', MalFunction.builtin(ast => EVAL(ast, replEnv)));
replEnv.setValue('*ARGV*', new MalList(MAL_ARGV.slice(1).map(arg => new MalString(arg))));

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

function isFunctionCall (ast, fnName = null) {
  return (
    ast instanceof MalList &&
    ast.items[0] instanceof MalSymbol &&
    (!fnName || (ast.items[0].name === fnName))
  );
}

function quasiquote (ast) {
  if (![ MalList, MalVector ].includes(ast.constructor) || (ast.length <= 0)) {
    return new MalList([ new MalSymbol('quote'), ast ]);
  }
  const [ first, ...rest ] = ast.items;
  if (isFunctionCall(ast, 'unquote')) {
    if (rest.length < 1) {
      throw new Error('Too few arguments to unquote');
    } else if (rest.length > 1) {
      throw new Error('Too many arguments to unquote');
    }
    return rest[0];
  }
  if (isFunctionCall(first, 'splice-unquote')) {
    if (first.length < 2) {
      throw new Error('Too few arguments to splice-unquote');
    } else if (first.length > 2) {
      throw new Error('Too many arguments to splice-unquote');
    }
    return new MalList([ new MalSymbol('concat'), first.items[1], quasiquote(new MalList(rest)) ]);
  }
  return new MalList([ new MalSymbol('cons'), quasiquote(first), quasiquote(new MalList(rest)) ]);
}

function EVAL (ast, env) {
  while (true) {
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

          // TCO
          env = newEnv;
          ast = args[1];
          continue;
        case 'do':
          evalAst(new MalList(args.slice(0, -1)), env);

          // TCO
          ast = args[args.length - 1];
          continue;
        case 'if':
          if (args.length < 2) {
            throw new Error('Too few arguments to if');
          } else if (args.length > 3) {
            throw new Error('Too many arguments to if');
          }
          const conditionResult = EVAL(args[0], env);
          if (![ MAL_NIL, MAL_FALSE ].includes(conditionResult)) {
            // TCO
            ast = args[1];
            continue;
          } else if (args.length >= 3) {
            // TCO
            ast = args[2];
            continue;
          } else {
            return MAL_NIL;
          }
        case 'fn*':
          if (args.length < 1) {
            throw new Error('Parameter declaration missing');
          } else if (![ MalList, MalVector ].includes(args[0].constructor)) {
            throw new Error('Parameter declaration def should be a vector');
          }
          const [ paramDecl, ...fnBody ] = args;
          const params = paramDecl.items.map(bind => {
            if (!(bind instanceof MalSymbol)) {
              throw new Error(`fn params must be Symbols`);
            }
            return bind.name;
          });
          return MalFunction.tco(env, params, fnBody, (env, params, fnBody, paramValues) => {
            const newEnv = new Env(env, params, paramValues);
            if (fnBody.length <= 0) {
              return MAL_NIL;
            }
            const evaledArgs = fnBody.map(arg => EVAL(arg, newEnv));
            return evaledArgs[evaledArgs.length - 1];
          });
        case 'quote':
          if (args.length < 1) {
            throw new Error('Too few arguments to quote');
          } else if (args.length > 1) {
            throw new Error('Too many arguments to quote');
          }
          return args[0];
        case 'quasiquote':
          if (args.length < 1) {
            throw new Error('Too few arguments to quasiquote');
          } else if (args.length > 1) {
            throw new Error('Too many arguments to quasiquote');
          }

          // TCO
          ast = quasiquote(args[0]);
          continue;
      }
    }
    const [ malFn, ...malArgs ] = evalAst(ast, env).items;

    if (malFn.canTco) {
      const newEnv = new Env(malFn.env, malFn.params, malArgs);
      const firstBodyElements = malFn.fnBody.slice(0, -1);
      const lastBodyElement = malFn.fnBody[malFn.fnBody.length - 1];
      evalAst(new MalList(firstBodyElements), newEnv);

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

if (MAL_ARGV.length > 0) {
  const cmd = `(load-file ${printString(new MalString(MAL_ARGV[0]), true)})`;
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
