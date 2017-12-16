import { MalList } from './types.mjs';

export class Env {
  constructor (outer = null, binds = [], exprs = []) {
    this._outer = outer;
    this._values = new Map();
    for (let i = 0; i < binds.length; i += 1) {
      if (binds[i] === '&') {
        this._values.set(binds[i + 1], new MalList(exprs.slice(i)));
        break;
      } else {
        this._values.set(binds[i], exprs[i]);
      }
    }
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
