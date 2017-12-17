class MalType {
  constructor () {
    this._isListLike = false;
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

function equalsListLike (a, b) {
  if (!a._isListLike && !b._isListLike) {
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

export class MalList extends MalType {
  constructor (items = []) {
    super();
    this.items = items;
    this._isListLike = true;
  }

  get length () {
    return this.items.length;
  }

  equals (other) {
    return equalsListLike(this, other);
  }

  toString (readable = false) {
    return `(${this.items.map(item => item.toString(readable)).join(' ')})`;
  }
}

export class MalVector extends MalType {
  constructor (items = []) {
    super();
    this.items = items;
    this._isListLike = true;
  }

  get length () {
    return this.items.length;
  }

  equals (other) {
    return equalsListLike(this, other);
  }

  toString (readable = false) {
    return `[${this.items.map(item => item.toString(readable)).join(' ')}]`;
  }
}

export class MalHashMap extends MalType {
  constructor (items = []) {
    super();
    this.items = items;
  }

  get length () {
    return this.items.size;
  }

  equals (other) {
    if (!this.hasSameType(other)) {
      return false;
    }
    if (this.length !== other.length) {
      return false;
    }
    for (const key of this.items.keys()) {
      if (!this.items.get(key).equals(other.items.get(key))) {
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

export class MalSymbol extends MalType {
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

export class MalNumber extends MalType {
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

export class MalString extends MalType {
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

export class MalKeyword extends MalType {
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

export class MalFunction extends MalType {
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

export class MalConstant extends MalType {
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

export class MalAtom extends MalType {
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

export const MAL_NIL = new MalConstant('nil');

export const MAL_TRUE = new MalConstant('true');

export const MAL_FALSE = new MalConstant('false');
