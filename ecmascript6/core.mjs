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

  env.setValue('list', MalFunction.builtin((...args) => new MalList(args)));

  env.setValue('list?', MalFunction.builtin(arg => toMalBool(arg instanceof MalList)));

  env.setValue('empty?', MalFunction.builtin(arg => toMalBool(arg.length <= 0)));

  env.setValue('count', MalFunction.builtin(arg => {
    if (arg === MAL_NIL) {
      return new MalNumber(0);
    }
    if ('length' in arg) {
      return new MalNumber(arg.length);
    }
    throw new Error(`count not supported on this type: ${arg.constructor.name}`);
  }));

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
