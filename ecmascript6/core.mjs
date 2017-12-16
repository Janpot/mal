import { printString } from './printer.mjs';
import {
  MalList,
  MalString,
  MalNumber,
  MalRawFunction,
  MAL_NIL,
  MAL_TRUE,
  MAL_FALSE
} from './types.mjs';

function toMalBool (value) {
  return value ? MAL_TRUE : MAL_FALSE;
}

export function bindTo (env) {
  env.setValue('+', new MalRawFunction((a, b) => new MalNumber(a.value + b.value)));

  env.setValue('-', new MalRawFunction((a, b) => new MalNumber(a.value - b.value)));

  env.setValue('*', new MalRawFunction((a, b) => new MalNumber(a.value * b.value)));

  env.setValue('/', new MalRawFunction((a, b) => new MalNumber(a.value / b.value)));

  env.setValue('=', new MalRawFunction((a, b) => toMalBool(a.equals(b))));

  env.setValue('<', new MalRawFunction((a, b) => toMalBool(a.compareTo(b) < 0)));

  env.setValue('<=', new MalRawFunction((a, b) => toMalBool(a.compareTo(b) <= 0)));

  env.setValue('>', new MalRawFunction((a, b) => toMalBool(a.compareTo(b) > 0)));

  env.setValue('>=', new MalRawFunction((a, b) => toMalBool(a.compareTo(b) >= 0)));

  env.setValue('list', new MalRawFunction((...args) => new MalList(args)));

  env.setValue('list?', new MalRawFunction(arg => toMalBool(arg instanceof MalList)));

  env.setValue('empty?', new MalRawFunction(arg => toMalBool(arg.length <= 0)));

  env.setValue('count', new MalRawFunction(arg => {
    if (arg === MAL_NIL) {
      return new MalNumber(0);
    }
    if ('length' in arg) {
      return new MalNumber(arg.length);
    }
    throw new Error(`count not supported on this type: ${arg.constructor.name}`);
  }));

  env.setValue('pr-str', new MalRawFunction((...args) => {
    return new MalString(args.map(arg => printString(arg, true)).join(' '));
  }));

  env.setValue('str', new MalRawFunction((...args) => {
    return new MalString(args.map(arg => printString(arg, false)).join(''));
  }));

  env.setValue('prn', new MalRawFunction((...args) => {
    const output = args.map(arg => printString(arg, true)).join(' ');
    console.log(output);
    return MAL_NIL;
  }));

  env.setValue('println', new MalRawFunction((...args) => {
    const output = args.map(arg => printString(arg, false)).join(' ');
    console.log(output);
    return MAL_NIL;
  }));
}
