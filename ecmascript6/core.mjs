import { printString } from './printer.mjs';
import { readString } from './reader.mjs';
import fs from 'fs';
import path from 'path';
import {
  MalList,
  MalString,
  MalNumber,
  MalFunction,
  MalAtom,
  MAL_NIL,
  MAL_TRUE,
  MAL_FALSE
} from './types.mjs';

function toMalBool (value) {
  return value ? MAL_TRUE : MAL_FALSE;
}

export function bindTo (env) {
  env.setValue('+', MalFunction.builtin((a, b) => new MalNumber(a.value + b.value)));

  env.setValue('-', MalFunction.builtin((a, b) => new MalNumber(a.value - b.value)));

  env.setValue('*', MalFunction.builtin((a, b) => new MalNumber(a.value * b.value)));

  env.setValue('/', MalFunction.builtin((a, b) => new MalNumber(a.value / b.value)));

  env.setValue('=', MalFunction.builtin((a, b) => toMalBool(a.equals(b))));

  env.setValue('<', MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) < 0)));

  env.setValue('<=', MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) <= 0)));

  env.setValue('>', MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) > 0)));

  env.setValue('>=', MalFunction.builtin((a, b) => toMalBool(a.compareTo(b) >= 0)));

  env.setValue('list', MalFunction.builtin((...items) => new MalList(items)));

  env.setValue('list?', MalFunction.builtin(maybeList => toMalBool(maybeList instanceof MalList)));

  env.setValue('empty?', MalFunction.builtin(list => toMalBool(list.length <= 0)));

  env.setValue('nth', MalFunction.builtin((list, index) => {
    if (index < 0 || index >= list.length) {
      throw new Error(`Index ${index} out of bounds`);
    }
    return list.items[index];
  }));

  env.setValue('first', MalFunction.builtin(list => {
    if (list === MAL_NIL || list.length <= 0) {
      return MAL_NIL;
    }
    return list.items[0];
  }));

  env.setValue('rest', MalFunction.builtin(list => {
    if (list === MAL_NIL) {
      return new MalList();
    }
    return new MalList(list.items.slice(1));
  }));

  env.setValue('count', MalFunction.builtin(list => {
    if (list === MAL_NIL) {
      return new MalNumber(0);
    }
    if ('length' in list) {
      return new MalNumber(list.length);
    }
    throw new Error(`count not supported on this type: ${list.constructor.name}`);
  }));

  env.setValue('cons', MalFunction.builtin((value, list) => new MalList([ value, ...list.items ])));

  env.setValue('concat', MalFunction.builtin((...lists) => new MalList([].concat(...lists.map(list => list.items)))));

  env.setValue('pr-str', MalFunction.builtin((...args) => {
    return new MalString(args.map(arg => printString(arg, true)).join(' '));
  }));

  env.setValue('str', MalFunction.builtin((...args) => {
    return new MalString(args.map(arg => printString(arg, false)).join(''));
  }));

  env.setValue('prn', MalFunction.builtin((...args) => {
    const output = args.map(arg => printString(arg, true)).join(' ');
    console.log(output);
    return MAL_NIL;
  }));

  env.setValue('println', MalFunction.builtin((...args) => {
    const output = args.map(arg => printString(arg, false)).join(' ');
    console.log(output);
    return MAL_NIL;
  }));

  env.setValue('read-string', MalFunction.builtin(input => readString(input.value)));

  env.setValue('slurp', MalFunction.builtin(filePath => {
    const absPath = path.resolve(process.cwd(), filePath.value);
    return new MalString(fs.readFileSync(absPath, { encoding: 'utf-8' }));
  }));

  env.setValue('atom', MalFunction.builtin(malValue => new MalAtom(malValue)));

  env.setValue('atom?', MalFunction.builtin(maybeAtom => toMalBool(maybeAtom instanceof MalAtom)));

  env.setValue('deref', MalFunction.builtin(atom => atom.ref));

  env.setValue('reset!', MalFunction.builtin((atom, malValue) => {
    atom.ref = malValue;
    return malValue;
  }));

  env.setValue('swap!', MalFunction.builtin((atom, fn, ...args) => {
    const newValue = fn.apply([ atom.ref, ...args ]);
    atom.ref = newValue;
    return newValue;
  }));
}
