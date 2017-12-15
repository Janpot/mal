export class Env {
  constructor (outer = null) {
    this._outer = outer;
    this._values = new Map();
  }

  setValue (key, value) {
    this._values.set(key, value);
  }

  findValue (key) {
    if (this._values.has(key)) {
      return this;
    } else if (this._outer) {
      return this._outer.findValue(key);
    } else {
      return null;
    }
  }

  getValue (key) {
    const env = this.findValue(key);
    if (env) {
      return env._values.get(key);
    }
    return null;
  }
}
