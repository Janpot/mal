import { printString } from './printer.mjs';
import { readString } from './reader.mjs';
import fs from 'fs';
import path from 'path';
import { pairwise } from './iterTools.mjs';
import * as types from './types.mjs';
import { prompt } from './readline.mjs';

export function bindTo (env) {
  env.setValue('+', types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) + types.toJsNumber(b))));

  env.setValue('-', types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) - types.toJsNumber(b))));

  env.setValue('*', types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) * types.toJsNumber(b))));

  env.setValue('/', types.createBuiltin((a, b) => types.createNumber(types.toJsNumber(a) / types.toJsNumber(b))));

  env.setValue('=', types.createBuiltin((a, b) => types.createBool(types.isEqual(a, b))));

  env.setValue('<', types.createBuiltin((a, b) => types.createBool(types.toJsNumber(a) < types.toJsNumber(b))));

  env.setValue('<=', types.createBuiltin((a, b) => types.createBool(types.toJsNumber(a) <= types.toJsNumber(b))));

  env.setValue('>', types.createBuiltin((a, b) => types.createBool(types.toJsNumber(a) > types.toJsNumber(b))));

  env.setValue('>=', types.createBuiltin((a, b) => types.createBool(types.toJsNumber(a) >= types.toJsNumber(b))));

  env.setValue('empty?', types.createBuiltin(list => types.createBool(types.lengthOf(list) <= 0)));

  env.setValue('nth', types.createBuiltin((list, index) => {
    const indexValue = types.toJsNumber(index);
    if (indexValue < 0 || indexValue >= types.lengthOf(list)) {
      throw new Error(`Index ${indexValue} out of bounds`);
    }
    return types.toJsArray(list)[indexValue];
  }));

  env.setValue('first', types.createBuiltin(list => {
    if (list === types.NIL || types.lengthOf(list) <= 0) {
      return types.NIL;
    }
    return types.toJsArray(list)[0];
  }));

  env.setValue('rest', types.createBuiltin(list => {
    if (list === types.NIL) {
      return types.createList();
    }
    return types.createList(types.toJsArray(list).slice(1));
  }));

  env.setValue('count', types.createBuiltin(list => {
    if (list === types.NIL) {
      return types.createNumber(0);
    }
    return types.createNumber(types.lengthOf(list));
  }));

  env.setValue('cons', types.createBuiltin((value, list) => types.createList([ value, ...types.toJsArray(list) ])));

  env.setValue('concat', types.createBuiltin((...lists) => {
    const flattenedItems = [].concat(...lists.map(list => types.toJsArray(list)));
    return types.createList(flattenedItems);
  }));

  env.setValue('conj', types.createBuiltin((collection, ...elements) => {
    if (types.isList(collection)) {
      return types.createList(elements.reverse().concat(types.toJsArray(collection)));
    } else if (types.isVector(collection)) {
      return types.createVector(types.toJsArray(collection).concat(elements));
    } else {
      return types.NIL;
    }
  }));

  env.setValue('seq', types.createBuiltin(arg => {
    if (types.isList(arg) && types.lengthOf(arg) > 0) {
      return arg;
    } else if (types.isVector(arg) && types.lengthOf(arg) > 0) {
      return types.createList(types.toJsArray(arg));
    } else if (types.isString(arg) && types.lengthOf(arg) > 0) {
      return types.createList(types.toJsString(arg).split('').map(character => types.createString(character)));
    } else {
      return types.NIL;
    }
  }));

  env.setValue('pr-str', types.createBuiltin((...args) => {
    return types.createString(args.map(arg => printString(arg, true)).join(' '));
  }));

  env.setValue('str', types.createBuiltin((...args) => {
    return types.createString(args.map(arg => printString(arg, false)).join(''));
  }));

  env.setValue('prn', types.createBuiltin((...args) => {
    const output = args.map(arg => printString(arg, true)).join(' ');
    console.log(output);
    return types.NIL;
  }));

  env.setValue('println', types.createBuiltin((...args) => {
    const output = args.map(arg => printString(arg, false)).join(' ');
    console.log(output);
    return types.NIL;
  }));

  env.setValue('readline', types.createBuiltin(question => {
    return types.createString(prompt(types.toJsString(question)));
  }));

  env.setValue('read-string', types.createBuiltin(string => readString(types.toJsString(string))));

  env.setValue('slurp', types.createBuiltin(filePath => {
    const absPath = path.resolve(process.cwd(), types.toJsString(filePath));
    return types.createString(fs.readFileSync(absPath, { encoding: 'utf-8' }));
  }));

  env.setValue('deref', types.createBuiltin(atom => types.deref(atom)));

  env.setValue('reset!', types.createBuiltin((atom, newValue) => types.reset(atom, newValue)));

  env.setValue('swap!', types.createBuiltin((atom, fn, ...args) => {
    const newValue = fn.apply([ types.deref(atom), ...args ]);
    return types.reset(atom, newValue);
  }));

  env.setValue('throw', types.createBuiltin(exception => {
    throw new types.MalException(exception);
  }));

  env.setValue('apply', types.createBuiltin((fn, ...args) => {
    const firstArgs = args.slice(0, -1);
    const lastArg = args[args.length - 1];
    const applyArgs = firstArgs.concat(types.toJsArray(lastArg));
    return fn.apply(applyArgs);
  }));

  env.setValue('map', types.createBuiltin((fn, list) => {
    return types.createList(types.toJsArray(list).map(item => fn.apply([ item ])));
  }));

  env.setValue('assoc', types.createBuiltin((hashMap, ...newItems) => {
    return types.createHashMap(new Map([
      ...pairwise(newItems),
      ...types.toJsMap(hashMap).entries()
    ]));
  }));

  env.setValue('dissoc', types.createBuiltin((hashMap, ...keysToRemove) => {
    const entries = [...types.toJsMap(hashMap).entries()];
    const newEntries = entries.filter(([ key ]) => !keysToRemove.some(keyToRemove => types.isEqual(key, keyToRemove)));
    return types.createHashMap(new Map([...newEntries]));
  }));

  env.setValue('meta', types.createBuiltin(fn => types.meta(fn)));

  env.setValue('with-meta', types.createBuiltin((fn, value) => types.withMeta(fn, value)));

  env.setValue('time-ms', types.createBuiltin((hashMap, key) => types.createNumber(Date.now())));

  env.setValue('get', types.createBuiltin((hashMap, key) => types.get(hashMap, key)));

  env.setValue('keys', types.createBuiltin(hashMap => types.createList([...types.toJsMap(hashMap).keys()])));

  env.setValue('vals', types.createBuiltin(hashMap => types.createList([...types.toJsMap(hashMap).values()])));

  env.setValue('list', types.createBuiltin((...items) => types.createList(items)));

  env.setValue('vector', types.createBuiltin((...items) => types.createVector(items)));

  env.setValue('hash-map', types.createBuiltin((...items) => types.createHashMap(new Map(pairwise(items)))));

  env.setValue('atom', types.createBuiltin(malValue => types.createAtom(malValue)));

  env.setValue('symbol', types.createBuiltin(name => types.createSymbol(types.toJsString(name))));

  env.setValue('string', types.createBuiltin(name => types.createNumber(types.toJsString(name))));

  env.setValue('number', types.createBuiltin(name => types.createNumber(types.toJsString(name))));

  env.setValue('keyword', types.createBuiltin(name => types.createKeyword(types.toJsString(name))));

  env.setValue('list?', types.createBuiltin(maybeList => types.createBool(types.isList(maybeList))));

  env.setValue('vector?', types.createBuiltin(maybeVector => types.createBool(types.isVector(maybeVector))));

  env.setValue('sequential?', types.createBuiltin(maybeSequential => types.createBool(types.isSequential(maybeSequential))));

  env.setValue('map?', types.createBuiltin(maybeHashMap => types.createBool(types.isHashMap(maybeHashMap))));

  env.setValue('contains?', types.createBuiltin((hashMap, key) => types.createBool(types.contains(hashMap, key))));

  env.setValue('atom?', types.createBuiltin(maybeAtom => types.createBool(types.isAtom(maybeAtom))));

  env.setValue('symbol?', types.createBuiltin(maybeSymbol => types.createBool(types.isSymbol(maybeSymbol))));

  env.setValue('fn?', types.createBuiltin(maybeSymbol => types.createBool(types.isFunction(maybeSymbol) && !types.isMacro(maybeSymbol))));

  env.setValue('macro?', types.createBuiltin(maybeSymbol => types.createBool(types.isMacro(maybeSymbol))));

  env.setValue('string?', types.createBuiltin(maybeSymbol => types.createBool(types.isString(maybeSymbol))));

  env.setValue('number?', types.createBuiltin(maybeSymbol => types.createBool(types.isNumber(maybeSymbol))));

  env.setValue('keyword?', types.createBuiltin(maybeKeyword => types.createBool(types.isKeyword(maybeKeyword))));

  env.setValue('nil?', types.createBuiltin(maybeNil => types.createBool(maybeNil === types.NIL)));

  env.setValue('true?', types.createBuiltin(maybeTrue => types.createBool(maybeTrue === types.TRUE)));

  env.setValue('false?', types.createBuiltin(maybeFalse => types.createBool(maybeFalse === types.FALSE)));
}
