import { prompt } from './readline.mjs';
import { readString } from './reader.mjs';
import { printString } from './printer.mjs';
import * as types from './types.mjs';

function READ (input) {
  return readString(input);
}

const replEnv = {
  '+': types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) + types.toJsNumber(b))),
  '-': types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) - types.toJsNumber(b))),
  '*': types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) * types.toJsNumber(b))),
  '/': types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) / types.toJsNumber(b)))
};

function evalAst (ast, env) {
  if (types.isList(ast)) {
    return types.createList(types.toJsArray(ast).map(item => EVAL(item, env)));
  } else if (types.isVector(ast)) {
    return types.createVector(types.toJsArray(ast).map(item => EVAL(item, env)));
  } else if (types.isHashMap(ast)) {
    const evaluatedEntries = Array.from(types.toJsMap(ast).entries())
      .map(([ key, value ]) => [ EVAL(key, env), EVAL(value, env) ]);
    return types.createHashMap(new Map(evaluatedEntries));
  } else if (types.isSymbol(ast)) {
    if (env[types.getSymbolName(ast)]) {
      return env[types.getSymbolName(ast)];
    }
    throw new Error(`Unknown symbol "${types.getSymbolName(ast)}"`);
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

  const evaledList = evalAst(ast, env);
  const [ malFn, ...malArgs ] = types.toJsArray(evaledList);
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

while (true) {
  const input = prompt('user> ');
  try {
    const output = rep(input);
    if (output) {
      console.log(output);
    }
  } catch (error) {
    console.error(error);
  }
}
