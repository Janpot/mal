class MalType {

}

export class MalList extends MalType {
  constructor (items) {
    super();
    this.items = items;
  }

  get length () {
    return this.items.length;
  }
}

export class MalVector extends MalType {
  constructor (items) {
    super();
    this.items = items;
  }

  get length () {
    return this.items.length;
  }
}

export class MalHashMap extends MalType {
  constructor (items) {
    super();
    this.items = items;
  }
}

export class MalSymbol extends MalType {
  constructor (name) {
    super();
    this.name = name;
  }
}

export class MalNumber extends MalType {
  constructor (value) {
    super();
    this.value = value;
  }
}

export class MalString extends MalType {
  constructor (value) {
    super();
    this.value = value;
  }
}

export class MalKeyword extends MalType {
  constructor (name) {
    super();
    this.name = name;
  }
}

export class MalFunction extends MalType {
  constructor (fn) {
    super();
    this._fn = fn;
  }

  apply (...args) {
    return this._fn.apply(...args);
  }
}

export class MalNil extends MalType {}

export class MalTrue extends MalType {}

export class MalFalse extends MalType {}
