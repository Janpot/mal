class MalType {
  constructor () {
    this.meta = null;
  }

  hasSameType (other) {
    return this.constructor === other.constructor;
  }

  equals (other) {
    throw new Error('Must be overridden');
  }
}

function equalsSequential (a, b) {
  if (!isSequential(a) || !isSequential(b)) {
    return false;
  }
  if (lengthOf(a) !== lengthOf(b)) {
    return false;
  }
  for (let i = 0; i < lengthOf(a); i += 1) {
    if (!a.items[i].equals(b.items[i])) {
      return false;
    }
  }
  return true;
}

class MalList extends MalType {
  constructor (items = []) {
    super();
    this.items = items;
  }

  clone () {
    return new MalList(this.items);
  }

  equals (other) {
    return equalsSequential(this, other);
  }
}

class MalVector extends MalType {
  constructor (items = []) {
    super();
    this.items = items;
  }

  clone () {
    return new MalVector(this.items);
  }

  equals (other) {
    return equalsSequential(this, other);
  }
}

class MalHashMap extends MalType {
  constructor (items = new Map()) {
    super();
    this.items = items;
  }

  get (key) {
    const entry = [...this.items.entries()].find(([ existingKey ]) => existingKey.equals(key));
    return entry ? entry[1] : NIL;
  }

  clone () {
    return new MalHashMap(this.items);
  }

  equals (other) {
    if (!this.hasSameType(other)) {
      return false;
    }
    if (lengthOf(this) !== lengthOf(other)) {
      return false;
    }
    for (const key of this.items.keys()) {
      if (!this.get(key).equals(other.get(key))) {
        return false;
      }
    }
    return true;
  }
}

class MalSymbol extends MalType {
  constructor (name) {
    super();
    this.name = name;
  }

  equals (other) {
    return this.hasSameType(other) && (this.name === other.name);
  }
}

class MalNumber extends MalType {
  constructor (value) {
    super();
    this.value = value;
  }

  equals (other) {
    return this.hasSameType(other) && (this.value === other.value);
  }
}

class MalString extends MalType {
  constructor (value) {
    super();
    this.value = value;
  }

  equals (other) {
    return this.hasSameType(other) && (this.value === other.value);
  }
}

class MalKeyword extends MalType {
  constructor (name) {
    super();
    this.name = name;
  }

  equals (other) {
    return this.hasSameType(other) && (this.name === other.name);
  }
}

class MalFunction extends MalType {
  constructor (env, params, fnBody, apply) {
    super();
    this.env = env;
    this.params = params;
    this.fnBody = fnBody;
    this._apply = apply;
    this.canTco = false;
    this.isMacro = false;
  }

  clone () {
    const clone = new MalFunction(this.env, this.params, this.fnBody, this._apply);
    clone.canTco = this.canTco;
    clone.isMacro = this.isMacro;
    return clone;
  }

  apply (args) {
    return this._apply(this.env, this.params, this.fnBody, args);
  }

  equals (other) {
    return false;
  }
}

class MalAtom extends MalType {
  constructor (value = NIL) {
    super();
    this._ref = value;
  }

  deref () {
    return this._ref;
  }

  reset (value) {
    this._ref = value;
    return value;
  }

  equals (other) {
    return this.hasSameType(other) && (this.ref === other.ref);
  }
}

class MalConstant extends MalType {}

export const NIL = new MalConstant();

export const TRUE = new MalConstant();

export const FALSE = new MalConstant();

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
  return new MalList(items);
}

export function createVector (items) {
  return new MalVector(items);
}

export function createHashMap (items) {
  return new MalHashMap(items);
}

export function createSymbol (name) {
  return new MalSymbol(name);
}

export function createNumber (value) {
  return new MalNumber(value);
}

export function createString (value) {
  return new MalString(value);
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
  return isList(value) || isVector(value);
}

export function isHashMap (value) {
  return value instanceof MalHashMap;
}

export function isSymbol (value) {
  return value instanceof MalSymbol;
}

export function isNumber (value) {
  return value instanceof MalNumber;
}

export function isString (value) {
  return value instanceof MalString;
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
    return malNumber.value;
  } else {
    console.log(malNumber);
    throw new Error(`can\t cast ${malNumber} to a number`);
  }
}

export function toJsString (malString) {
  if (isString(malString)) {
    return malString.value;
  } else {
    throw new Error(`can\t cast ${malString} to a string`);
  }
}

export function toJsArray (malSequence) {
  if (isList(malSequence)) {
    return malSequence.items;
  } else if (isVector(malSequence)) {
    return malSequence.items;
  } else {
    throw new Error('Can\'t get items from a non-collection');
  }
}

export function toJsMap (malHashMap) {
  if (isHashMap(malHashMap)) {
    return malHashMap.items;
  } else {
    throw new Error('Can\'t get items from a non-collection');
  }
}

export function isEqual (a, b) {
  if (a === NIL || a === TRUE || a === FALSE) {
    return a === b;
  }
  return a.equals(b);
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
  return symbol.name;
}

// keyword helpers

export function getKeywordName (keyword) {
  return keyword.name;
}

// meta helpers

export function meta (value) {
  return value.meta || NIL;
}

export function withMeta (value, meta) {
  const clone = value.clone();
  clone.meta = meta;
  return clone;
}
