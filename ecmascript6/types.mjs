class MalType {
  constructor () {
    this._isSequential = false;
  }

  get count () {
    throw new Error(`count not supported on this type: ${this.constructor.name}`);
  }

  hasSameType (other) {
    return this.constructor === other.constructor;
  }

  equals (other) {
    throw new Error('Must be overridden');
  }

  toString (readable = false) {
    return `[${this.constructor.name}]`;
  }
}

function equalsSequential (a, b) {
  if (!a._isSequential || !b._isSequential) {
    return false;
  }
  if (a.length !== b.length) {
    return false;
  }
  for (let i = 0; i < a.items.length; i += 1) {
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
    this._isSequential = true;
  }

  get length () {
    return this.items.length;
  }

  equals (other) {
    return equalsSequential(this, other);
  }

  toString (readable = false) {
    return `(${this.items.map(item => item.toString(readable)).join(' ')})`;
  }
}

class MalVector extends MalType {
  constructor (items = []) {
    super();
    this.items = items;
    this._isSequential = true;
  }

  get length () {
    return this.items.length;
  }

  equals (other) {
    return equalsSequential(this, other);
  }

  toString (readable = false) {
    return `[${this.items.map(item => item.toString(readable)).join(' ')}]`;
  }
}

class MalHashMap extends MalType {
  constructor (items = new Map()) {
    super();
    this.items = items;
  }

  get length () {
    return this.items.size;
  }

  get (key) {
    const entry = [...this.items.entries()].find(([ existingKey ]) => existingKey.equals(key));
    return entry ? entry[1] : NIL;
  }

  has (key) {
    const entry = [...this.items.entries()].find(([ existingKey ]) => existingKey.equals(key));
    return !!entry;
  }

  equals (other) {
    if (!this.hasSameType(other)) {
      return false;
    }
    if (this.length !== other.length) {
      return false;
    }
    for (const key of this.items.keys()) {
      if (!this.get(key).equals(other.get(key))) {
        return false;
      }
    }
    return true;
  }

  toString (readable = false) {
    const flattenedItems = [].concat(...this.items.entries());
    return `{${flattenedItems.map(item => item.toString(readable)).join(' ')}}`;
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

  toString (readable = false) {
    return this.name;
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

  compareTo (other) {
    return this.value - other.value;
  }

  toString (readable = false) {
    return String(this.value);
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

  get _readableValue () {
    return this.value.replace(/[\\"\n]/g, character => {
      switch (character) {
        case '\n': return '\\n';
        default: return `\\${character}`;
      }
    });
  }

  toString (readable = false) {
    return readable ? `"${this._readableValue}"` : this.value;
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

  toString (readable = false) {
    return `:${this.name}`;
  }
}

class MalFunction extends MalType {
  static builtin (fn) {
    return new MalFunction(null, null, null, (env, params, fnBody, args) => fn(...args));
  }

  constructor (env, params, fnBody, apply) {
    super();
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

  equals (other) {
    return false;
  }

  toString (readable = false) {
    return '#';
  }
}

class MalConstant extends MalType {
  constructor (stringRep) {
    super();
    this._stringRep = stringRep;
  }

  equals (other) {
    return this === other;
  }

  toString (readable = false) {
    return this._stringRep;
  }
}

class MalAtom extends MalType {
  constructor (value) {
    super();
    this.ref = value;
  }

  equals (other) {
    return this.hasSameType(other) && (this.ref === other.ref);
  }

  toString (readable = false) {
    return `(atom ${this.ref.toString(readable)})`;
  }
}

export const NIL = new MalConstant('nil');

export const TRUE = new MalConstant('true');

export const FALSE = new MalConstant('false');

export class MalException extends Error {
  constructor (innerValue) {
    super();
    this.innerValue = innerValue;
  }
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
  return MalFunction.builtin(fn);
}

export function createAtom (value) {
  return new MalAtom(value);
}

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

export function isAtom (value) {
  return value instanceof MalAtom;
}
