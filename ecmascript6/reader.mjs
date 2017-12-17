import * as types from './types.mjs';
import { pairwise } from './iterTools.mjs';

const EOF = null;

class Reader {
  constructor (tokens) {
    this._tokens = [...tokens];
    this._pos = 0;
  }

  _advance () {
    this._pos += 1;
  }

  next () {
    const token = this.peek();
    this._advance();
    return token;
  }

  peek () {
    return this._tokens[this._pos] || EOF;
  }
}

function readAtom (reader) {
  const token = reader.next();
  if (token === 'nil') {
    return types.MAL_NIL;
  } else if (token === 'true') {
    return types.MAL_TRUE;
  } else if (token === 'false') {
    return types.MAL_FALSE;
  } else if (!isNaN(Number(token))) {
    return types.createNumber(Number(token));
  } else if (token.startsWith('"')) {
    if (!token.endsWith('"')) {
      throw new Error('EOF while reading string');
    }
    const stringValue = token
      .slice(1, token.length - 1)
      .replace(/\\(["n\\])/g, (_, character) => {
        switch (character) {
          case 'n': return '\n';
          default: return character;
        }
      });
    return types.createString(stringValue);
  } else if (token.startsWith(':')) {
    return types.createKeyword(token.slice(1));
  } else {
    return types.createSymbol(token);
  }
}

function readWrappingReaderMacro (reader, name) {
  reader.next();
  const object = readForm(reader);
  return types.createList([ types.createSymbol(name), object ]);
}

function readWithMetaReaderMacro (reader) {
  reader.next();
  const metadata = readForm(reader);
  const object = readForm(reader);
  return types.createList([ types.createSymbol('with-meta'), object, metadata ]);
}

function readListContent (reader, closingToken) {
  reader.next(); // openingToken
  const items = [];
  while (reader.peek() !== closingToken) {
    if (reader.peek() === EOF) {
      throw new Error('EOF while reading');
    }
    items.push(readForm(reader));
  }
  reader.next(); // closingToken
  return items;
}

function readList (reader) {
  return types.createList(readListContent(reader, ')'));
}

function readVector (reader) {
  return types.createVector(readListContent(reader, ']'));
}

function readHashMap (reader) {
  const items = readListContent(reader, '}');
  if (items.length % 2 !== 0) {
    throw new Error('Map literal must contain an even number of forms');
  }
  return types.createHashMap(new Map(pairwise(items)));
}

function readForm (reader) {
  const nextToken = reader.peek();
  switch (nextToken) {
    case '(': return readList(reader);
    case '[': return readVector(reader);
    case '{': return readHashMap(reader);
    case '\'': return readWrappingReaderMacro(reader, 'quote');
    case '`': return readWrappingReaderMacro(reader, 'quasiquote');
    case '~': return readWrappingReaderMacro(reader, 'unquote');
    case '~@': return readWrappingReaderMacro(reader, 'splice-unquote');
    case '@': return readWrappingReaderMacro(reader, 'deref');
    case '^': return readWithMetaReaderMacro(reader);
    case EOF: return null;
    default: return readAtom(reader);
  }
}

function * tokenizer (str) {
  for (const line of str.split('\n')) {
    const re = /[\s,]*(~@|[[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s[\]{}('"`,;)]*)/g;
    let match = re.exec(line);
    while (match[1] !== '') {
      if (match[1].startsWith(';')) {
        break;
      }

      yield match[1];
      match = re.exec(line);
    }
  }
}

export function readString (input) {
  return readForm(new Reader(tokenizer(input)));
}
