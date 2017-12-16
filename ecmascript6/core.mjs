import { printString } from './printer.mjs';
import {
  MalList,
  MalString,
  MalNumber,
  MalFunction,
  MAL_NIL,
  MAL_TRUE,
  MAL_FALSE
} from './types.mjs';

function toMalBool (value) {
  return value ? MAL_TRUE : MAL_FALSE;
}

export function bindTo (env) {
  env.setValue('+', MalFunction.raw((a, b) => new MalNumber(a.value + b.value)));

  env.setValue('-', MalFunction.raw((a, b) => new MalNumber(a.value - b.value)));

  env.setValue('*', MalFunction.raw((a, b) => new MalNumber(a.value * b.value)));

  env.setValue('/', MalFunction.raw((a, b) => new MalNumber(a.value / b.value)));

  env.setValue('=', MalFunction.raw((a, b) => toMalBool(a.equals(b))));

  env.setValue('<', MalFunction.raw((a, b) => toMalBool(a.compareTo(b) < 0)));

  env.setValue('<=', MalFunction.raw((a, b) => toMalBool(a.compareTo(b) <= 0)));

  env.setValue('>', MalFunction.raw((a, b) => toMalBool(a.compareTo(b) > 0)));

  env.setValue('>=', MalFunction.raw((a, b) => toMalBool(a.compareTo(b) >= 0)));

  env.setValue('list', MalFunction.raw((...args) => new MalList(args)));

  env.setValue('list?', MalFunction.raw(arg => toMalBool(arg instanceof MalList)));

  env.setValue('empty?', MalFunction.raw(arg => toMalBool(arg.length <= 0)));

  env.setValue('count', MalFunction.raw(arg => {
    if (arg === MAL_NIL) {
      return new MalNumber(0);
    }
    if ('length' in arg) {
      return new MalNumber(arg.length);
    }
    throw new Error(`count not supported on this type: ${arg.constructor.name}`);
  }));

  env.setValue('pr-str', MalFunction.raw((...args) => {
    return new MalString(args.map(arg => printString(arg, true)).join(' '));
  }));

  env.setValue('str', MalFunction.raw((...args) => {
    return new MalString(args.map(arg => printString(arg, false)).join(''));
  }));

  env.setValue('prn', MalFunction.raw((...args) => {
    const output = args.map(arg => printString(arg, true)).join(' ');
    console.log(output);
    return MAL_NIL;
  }));

  env.setValue('println', MalFunction.raw((...args) => {
    const output = args.map(arg => printString(arg, false)).join(' ');
    console.log(output);
    return MAL_NIL;
  }));
}
