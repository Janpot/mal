import { printString } from './printer.mjs';
import { readString } from './reader.mjs';
import fs from 'fs';
import path from 'path';
import { pairwise } from './iterTools.mjs';
import * as types from './types.mjs';

function toMalBool (value) {
  return value ? types.MAL_TRUE : types.MAL_FALSE;
}

export function bindTo (env) {
  env.setValue('+', types.MalFunction.builtin((a, b) => types.createNumber(a.value + b.value)));

  env.setValue('-', types.MalFunction.builtin((a, b) => types.createNumber(a.value - b.value)));

  env.setValue('*', types.MalFunction.builtin((a, b) => types.createNumber(a.value * b.value)));

  env.setValue('/', types.MalFunction.builtin((a, b) => types.createNumber(a.value / b.value)));

  env.setValue('=', types.MalFunction.builtin((a, b) => toMalBool(a.equals(b))));

  env.setValue('<', types.MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) < 0)));

  env.setValue('<=', types.MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) <= 0)));

  env.setValue('>', types.MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) > 0)));

  env.setValue('>=', types.MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) >= 0)));

  env.setValue('empty?', types.MalFunction.builtin(list => toMalBool(list.length <= 0)));

  env.setValue('nth', types.MalFunction.builtin((list, index) => {
    if (index < 0 || index >= list.length) {
      throw new Error(`Index ${index} out of bounds`);
    }
    return list.items[index];
  }));

  env.setValue('first', types.MalFunction.builtin(list => {
    if (list === types.MAL_NIL || list.length <= 0) {
      return types.MAL_NIL;
    }
    return list.items[0];
  }));

  env.setValue('rest', types.MalFunction.builtin(list => {
    if (list === types.MAL_NIL) {
      return types.createList();
    }
    return types.createList(list.items.slice(1));
  }));

  env.setValue('count', types.MalFunction.builtin(list => {
    if (list === types.MAL_NIL) {
      return types.createNumber(0);
    }
    if ('length' in list) {
      return types.createNumber(list.length);
    }
    throw new Error(`count not supported on this type: ${list.constructor.name}`);
  }));

  env.setValue('cons', types.MalFunction.builtin((value, list) => types.createList([ value, ...list.items ])));

  env.setValue('concat', types.MalFunction.builtin((...lists) => types.createList([].concat(...lists.map(list => list.items)))));

  env.setValue('pr-str', types.MalFunction.builtin((...args) => {
    return types.createString(args.map(arg => printString(arg, true)).join(' '));
  }));

  env.setValue('str', types.MalFunction.builtin((...args) => {
    return types.createString(args.map(arg => printString(arg, false)).join(''));
  }));

  env.setValue('prn', types.MalFunction.builtin((...args) => {
    const output = args.map(arg => printString(arg, true)).join(' ');
    console.log(output);
    return types.MAL_NIL;
  }));

  env.setValue('println', types.MalFunction.builtin((...args) => {
    const output = args.map(arg => printString(arg, false)).join(' ');
    console.log(output);
    return types.MAL_NIL;
  }));

  env.setValue('read-string', types.MalFunction.builtin(input => readString(input.value)));

  env.setValue('slurp', types.MalFunction.builtin(filePath => {
    const absPath = path.resolve(process.cwd(), filePath.value);
    return types.createString(fs.readFileSync(absPath, { encoding: 'utf-8' }));
  }));

  env.setValue('deref', types.MalFunction.builtin(atom => atom.ref));

  env.setValue('reset!', types.MalFunction.builtin((atom, malValue) => {
    atom.ref = malValue;
    return malValue;
  }));

  env.setValue('swap!', types.MalFunction.builtin((atom, fn, ...args) => {
    const newValue = fn.apply([ atom.ref, ...args ]);
    atom.ref = newValue;
    return newValue;
  }));

  env.setValue('throw', types.MalFunction.builtin(exception => {
    throw new types.MalException(exception);
  }));

  env.setValue('apply', types.MalFunction.builtin((fn, ...args) => {
    const applyArgs = args.slice(0, -1).concat(args[args.length - 1].items);
    return fn.apply(applyArgs);
  }));

  env.setValue('map', types.MalFunction.builtin((fn, list) => {
    return types.createList(list.items.map(item => fn.apply([ item ])));
  }));

  env.setValue('assoc', types.MalFunction.builtin((hashMap, ...newItems) => {
    return types.createHashMap(new Map([
      ...pairwise(newItems),
      ...hashMap.items.entries()
    ]));
  }));

  env.setValue('dissoc', types.MalFunction.builtin((hashMap, ...keys) => {
    return types.createHashMap(new Map([
      ...[...hashMap.items.entries()].filter(([ key ]) => !keys.some(toDissoc => toDissoc.equals(key)))
    ]));
  }));

  env.setValue('get', types.MalFunction.builtin((hashMap, key) => {
    if (hashMap === types.MAL_NIL) {
      return types.MAL_NIL;
    }
    return hashMap.get(key);
  }));

  env.setValue('keys', types.MalFunction.builtin(hashMap => types.createList([...hashMap.items.keys()])));

  env.setValue('vals', types.MalFunction.builtin(hashMap => types.createList([...hashMap.items.values()])));

  env.setValue('list', types.MalFunction.builtin((...items) => types.createList(items)));

  env.setValue('vector', types.MalFunction.builtin((...items) => types.createVector(items)));

  env.setValue('hash-map', types.MalFunction.builtin((...items) => types.createHashMap(new Map(pairwise(items)))));

  env.setValue('atom', types.MalFunction.builtin(malValue => types.createAtom(malValue)));

  env.setValue('symbol', types.MalFunction.builtin(name => types.createSymbol(name.value)));

  env.setValue('keyword', types.MalFunction.builtin(name => types.createKeyword(name.value)));

  env.setValue('list?', types.MalFunction.builtin(maybeList => toMalBool(types.isList(maybeList))));

  env.setValue('vector?', types.MalFunction.builtin(maybeVector => toMalBool(types.isVector(maybeVector))));

  env.setValue('sequential?', types.MalFunction.builtin(maybeSequential => toMalBool(types.isSequential(maybeSequential))));

  env.setValue('map?', types.MalFunction.builtin(maybeHashMap => toMalBool(types.isHashMap(maybeHashMap))));

  env.setValue('contains?', types.MalFunction.builtin((hashMap, key) => toMalBool(hashMap.has(key))));

  env.setValue('atom?', types.MalFunction.builtin(maybeAtom => toMalBool(types.isAtom(maybeAtom))));

  env.setValue('symbol?', types.MalFunction.builtin(maybeSymbol => toMalBool(types.isSymbol(maybeSymbol))));

  env.setValue('keyword?', types.MalFunction.builtin(maybeKeyword => toMalBool(types.isKeyword(maybeKeyword))));

  env.setValue('nil?', types.MalFunction.builtin(maybeNil => toMalBool(maybeNil === types.MAL_NIL)));

  env.setValue('true?', types.MalFunction.builtin(maybeTrue => toMalBool(maybeTrue === types.MAL_TRUE)));

  env.setValue('false?', types.MalFunction.builtin(maybeFalse => toMalBool(maybeFalse === types.MAL_FALSE)));
}
