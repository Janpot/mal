import { printString } from './printer.mjs';
import { pairwise } from './iterTools.mjs';

const META_KEY = Symbol('Meta key');

class MalList extends Array {}

class MalVector extends Array {}

class MalKeyword {
  constructor (name) {
    this.name = name;
  }
}

class MalFunction {
  constructor (env, params, fnBody, apply) {
    this.env = env;
    this.params = params;
    this.fnBody = fnBody;
    this._apply = apply;
    this.canTco = false;
    this.isMacro = false;
  }

  apply (args) {
    return this._apply(this.env, this.params, this.fnBody, args);
  }
}

class MalAtom {
  constructor (value = NIL) {
    this._ref = value;
  }

  deref () {
    return this._ref;
  }

  reset (value) {
    this._ref = value;
    return value;
  }
}

export const NIL = null;

export const TRUE = true;

export const FALSE = false;

export class MalException extends Error {
  constructor (innerValue) {
    super();
    this.innerValue = innerValue;
  }
}

// type creation

export function createBool (value) {
  return value ? TRUE : FALSE;
}

export function createList (items) {
  return MalList.from(items);
}

export function createVector (items) {
  return MalVector.from(items);
}

export function createHashMap (items) {
  return new Map(items);
}

export function createSymbol (name) {
  return Symbol.for(name);
}

export function createNumber (value) {
  return Number(value);
}

export function createString (value) {
  return String(value);
}

export function createKeyword (name) {
  return new MalKeyword(name);
}

export function createFunction (env, params, fnBody, apply) {
  return new MalFunction(env, params, fnBody, apply);
}

export function createBuiltin (fn) {
  return new MalFunction(null, null, null, (env, params, fnBody, args) => fn(...args));
}

export function createAtom (value) {
  return new MalAtom(value);
}

// type identification

export function isList (value) {
  return value instanceof MalList;
}

export function isVector (value) {
  return value instanceof MalVector;
}

export function isSequential (value) {
  return Array.isArray(value);
}

export function isHashMap (value) {
  return value instanceof Map;
}

export function isSymbol (value) {
  return typeof value === 'symbol';
}

export function isNumber (value) {
  return typeof value === 'number';
}

export function isString (value) {
  return typeof value === 'string';
}

export function isKeyword (value) {
  return value instanceof MalKeyword;
}

export function isFunction (value) {
  return value instanceof MalFunction;
}

export function isMacro (value) {
  return isFunction(value) && value.isMacro;
}

export function isAtom (value) {
  return value instanceof MalAtom;
}

// conversion helpers to javascript types

export function toJsNumber (malNumber) {
  if (isNumber(malNumber)) {
    return malNumber;
  } else {
    throw new Error(`can\t cast ${printString(malNumber, true)} to a number`);
  }
}

export function toJsString (malString) {
  if (isString(malString)) {
    return malString;
  } else {
    throw new Error(`can\t cast ${printString(malString, true)} to a string`);
  }
}

export function toJsArray (malSequence) {
  if (isList(malSequence)) {
    return malSequence;
  } else if (isVector(malSequence)) {
    return malSequence;
  } else {
    throw new Error('Can\'t get items from a non-collection');
  }
}

export function toJsMap (malHashMap) {
  if (isHashMap(malHashMap)) {
    return malHashMap;
  } else {
    throw new Error('Can\'t get items from a non-collection');
  }
}

export function isEqual (a, b) {
  if (a === NIL || a === TRUE || a === FALSE || isNumber(a) || isString(a) || isSymbol(a)) {
    return a === b;
  } else if (isSequential(a)) {
    if (!isSequential(b)) {
      return false;
    }
    if (lengthOf(a) !== lengthOf(b)) {
      return false;
    }
    for (let i = 0; i < lengthOf(a); i += 1) {
      if (!isEqual(nth(a, i), nth(b, i))) {
        return false;
      }
    }
    return true;
  } else if (isHashMap(a)) {
    if (!isHashMap(b)) {
      return false;
    }
    if (lengthOf(a) !== lengthOf(b)) {
      return false;
    }
    for (const [ key, value ] of toJsMap(a).entries()) {
      if (!isEqual(get(b, key), value)) {
        return false;
      }
    }
    return true;
  } else if (isFunction(a)) {
    return false;
  } else if (isAtom(a)) {
    return isAtom(b) && isEqual(deref(a), deref(b));
  } else if (isKeyword(a)) {
    return isKeyword(b) && (getKeywordName(a) === getKeywordName(b));
  }
  return false;
}

// collection helpers

export function lengthOf (malCollection) {
  if (isList(malCollection) || isVector(malCollection)) {
    return toJsArray(malCollection).length;
  } else if (isHashMap(malCollection)) {
    return toJsMap(malCollection).size;
  } else if (isString(malCollection)) {
    return toJsString(malCollection).length;
  } else {
    throw new Error('Can\'t get length of a non-collection');
  }
}

export function get (hashMap, keyToFind) {
  if (hashMap === NIL) {
    return NIL;
  } else if (isHashMap(hashMap)) {
    for (const [ key, value ] of toJsMap(hashMap).entries()) {
      if (isEqual(key, keyToFind)) {
        return value;
      }
    }
    return NIL;
  } else {
    throw new Error('Operation only allowed on hashmap');
  }
}

export function assoc (hashMap, ...keyValues) {
  if (hashMap === NIL || isHashMap(hashMap)) {
    const result = hashMap === NIL ? createHashMap() : createHashMap(toJsMap(hashMap));
    for (const [ key, value ] of pairwise(keyValues)) {
      const existingKey = [...hashMap.keys()].find(existingKey => isEqual(existingKey, key));
      if (existingKey === undefined) {
        result.set(key, value);
      } else {
        result.set(existingKey, value);
      }
    }
    return result;
  } else {
    throw new Error('Operation only allowed on hashmap');
  }
}

export function nth (sequence, n) {
  return toJsArray(sequence)[n];
}

export function contains (hashMap, keyToFind) {
  if (hashMap === NIL) {
    return false;
  } else if (isHashMap(hashMap)) {
    for (const [ key ] of toJsMap(hashMap).entries()) {
      if (isEqual(key, keyToFind)) {
        return true;
      }
    }
    return false;
  } else {
    throw new Error('Operation only allowed on hashmap');
  }
}

// atom helpers

export function reset (atom, value) {
  atom.ref = value;
  return atom.reset(value);
}

export function deref (atom) {
  return atom.deref();
}

// symbol helpers

export function getSymbolName (symbol) {
  return Symbol.keyFor(symbol);
}

// keyword helpers

export function getKeywordName (keyword) {
  return keyword.name;
}

// meta helpers

export function meta (value) {
  return value[META_KEY] || NIL;
}

function clone (value) {
  if (isVector(value)) {
    return createVector(toJsArray(value));
  } else if (isList(value)) {
    return createList(toJsArray(value));
  } else if (isHashMap(value)) {
    return createHashMap(toJsMap(value));
  } else if (isFunction(value)) {
    const clone = new MalFunction(value.env, value.params, value.fnBody, value._apply);
    clone.canTco = value.canTco;
    clone.isMacro = value.isMacro;
    return clone;
  } else {
    throw new Error('Can only clone compound types');
  }
}

export function withMeta (value, meta) {
  const newValue = clone(value);
  newValue[META_KEY] = meta;
  return newValue;
}
