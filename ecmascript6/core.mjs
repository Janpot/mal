import { printString } from './printer.mjs';
import { readString } from './reader.mjs';
import fs from 'fs';
import path from 'path';
import { pairwise } from './iterTools.mjs';
import * as types from './types.mjs';

function toMalBool (value) {
  return value ? types.TRUE : types.FALSE;
}

export function bindTo (env) {
  env.setValue('+', types.createBuiltin((a, b) => types.createNumber(a.value + b.value)));

  env.setValue('-', types.createBuiltin((a, b) => types.createNumber(a.value - b.value)));

  env.setValue('*', types.createBuiltin((a, b) => types.createNumber(a.value * b.value)));

  env.setValue('/', types.createBuiltin((a, b) => types.createNumber(a.value / b.value)));

  env.setValue('=', types.createBuiltin((a, b) => toMalBool(a.equals(b))));

  env.setValue('<', types.createBuiltin((a, b) => toMalBool(a.compareTo(b) < 0)));

  env.setValue('<=', types.createBuiltin((a, b) => toMalBool(a.compareTo(b) <= 0)));

  env.setValue('>', types.createBuiltin((a, b) => toMalBool(a.compareTo(b) > 0)));

  env.setValue('>=', types.createBuiltin((a, b) => toMalBool(a.compareTo(b) >= 0)));

  env.setValue('empty?', types.createBuiltin(list => toMalBool(types.lengthOf(list) <= 0)));

  env.setValue('nth', types.createBuiltin((list, index) => {
    if (index < 0 || index >= types.lengthOf(list)) {
      throw new Error(`Index ${index} out of bounds`);
    }
    return types.getItems(list)[index];
  }));

  env.setValue('first', types.createBuiltin(list => {
    if (list === types.NIL || types.lengthOf(list) <= 0) {
      return types.NIL;
    }
    return types.getItems(list)[0];
  }));

  env.setValue('rest', types.createBuiltin(list => {
    if (list === types.NIL) {
      return types.createList();
    }
    return types.createList(types.getItems(list).slice(1));
  }));

  env.setValue('count', types.createBuiltin(list => {
    if (list === types.NIL) {
      return types.createNumber(0);
    }
    if ('length' in list) {
      return types.createNumber(types.lengthOf(list));
    }
    throw new Error(`count not supported on this type: ${list.constructor.name}`);
  }));

  env.setValue('cons', types.createBuiltin((value, list) => types.createList([ value, ...types.getItems(list) ])));

  env.setValue('concat', types.createBuiltin((...lists) => {
    const flattenedItems = [].concat(...lists.map(list => types.getItems(list)));
    return types.createList(flattenedItems);
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

  env.setValue('read-string', types.createBuiltin(input => readString(input.value)));

  env.setValue('slurp', types.createBuiltin(filePath => {
    const absPath = path.resolve(process.cwd(), filePath.value);
    return types.createString(fs.readFileSync(absPath, { encoding: 'utf-8' }));
  }));

  env.setValue('deref', types.createBuiltin(atom => atom.ref));

  env.setValue('reset!', types.createBuiltin((atom, malValue) => {
    atom.ref = malValue;
    return malValue;
  }));

  env.setValue('swap!', types.createBuiltin((atom, fn, ...args) => {
    const newValue = fn.apply([ atom.ref, ...args ]);
    atom.ref = newValue;
    return newValue;
  }));

  env.setValue('throw', types.createBuiltin(exception => {
    throw new types.MalException(exception);
  }));

  env.setValue('apply', types.createBuiltin((fn, ...args) => {
    const firstArgs = args.slice(0, -1);
    const lastArg = args[args.length - 1];
    const applyArgs = firstArgs.concat(types.getItems(lastArg));
    return fn.apply(applyArgs);
  }));

  env.setValue('map', types.createBuiltin((fn, list) => {
    return types.createList(types.getItems(list).map(item => fn.apply([ item ])));
  }));

  env.setValue('assoc', types.createBuiltin((hashMap, ...newItems) => {
    return types.createHashMap(new Map([
      ...pairwise(newItems),
      ...types.getItems(hashMap).entries()
    ]));
  }));

  env.setValue('dissoc', types.createBuiltin((hashMap, ...keys) => {
    return types.createHashMap(new Map([
      ...[...types.getItems(hashMap).entries()].filter(([ key ]) => !keys.some(toDissoc => toDissoc.equals(key)))
    ]));
  }));

  env.setValue('get', types.createBuiltin((hashMap, key) => {
    if (hashMap === types.NIL) {
      return types.NIL;
    }
    return hashMap.get(key);
  }));

  env.setValue('keys', types.createBuiltin(hashMap => types.createList([...types.getItems(hashMap).keys()])));

  env.setValue('vals', types.createBuiltin(hashMap => types.createList([...types.getItems(hashMap).values()])));

  env.setValue('list', types.createBuiltin((...items) => types.createList(items)));

  env.setValue('vector', types.createBuiltin((...items) => types.createVector(items)));

  env.setValue('hash-map', types.createBuiltin((...items) => types.createHashMap(new Map(pairwise(items)))));

  env.setValue('atom', types.createBuiltin(malValue => types.createAtom(malValue)));

  env.setValue('symbol', types.createBuiltin(name => types.createSymbol(name.value)));

  env.setValue('keyword', types.createBuiltin(name => types.createKeyword(name.value)));

  env.setValue('list?', types.createBuiltin(maybeList => toMalBool(types.isList(maybeList))));

  env.setValue('vector?', types.createBuiltin(maybeVector => toMalBool(types.isVector(maybeVector))));

  env.setValue('sequential?', types.createBuiltin(maybeSequential => toMalBool(types.isSequential(maybeSequential))));

  env.setValue('map?', types.createBuiltin(maybeHashMap => toMalBool(types.isHashMap(maybeHashMap))));

  env.setValue('contains?', types.createBuiltin((hashMap, key) => toMalBool(hashMap.has(key))));

  env.setValue('atom?', types.createBuiltin(maybeAtom => toMalBool(types.isAtom(maybeAtom))));

  env.setValue('symbol?', types.createBuiltin(maybeSymbol => toMalBool(types.isSymbol(maybeSymbol))));

  env.setValue('keyword?', types.createBuiltin(maybeKeyword => toMalBool(types.isKeyword(maybeKeyword))));

  env.setValue('nil?', types.createBuiltin(maybeNil => toMalBool(maybeNil === types.NIL)));

  env.setValue('true?', types.createBuiltin(maybeTrue => toMalBool(maybeTrue === types.TRUE)));

  env.setValue('false?', types.createBuiltin(maybeFalse => toMalBool(maybeFalse === types.FALSE)));
}
