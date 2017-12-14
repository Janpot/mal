import {
  MalList,
  MalSymbol,
  MalNumber,
  MalVector,
  MalNil,
  MalTrue,
  MalFalse,
  MalString,
  MalHashMap,
  MalKeyword
} from './types.mjs';

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
    return new MalNil();
  } else if (token === 'true') {
    return new MalTrue();
  } else if (token === 'false') {
    return new MalFalse();
  } else if (!isNaN(Number(token))) {
    return new MalNumber(Number(token));
  } else if (token.startsWith('"')) {
    if (!token.endsWith('"')) {
      throw new Error('EOF while reading string');
    }
    const stringValue = token
      .slice(1, token.length - 1)
      .replace(/\\(["n\\])/g, (_, character) => character);
    return new MalString(stringValue);
  } else if (token.startsWith(':')) {
    return new MalKeyword(token.slice(1));
  } else {
    return new MalSymbol(token);
  }
}

function readWrappingReaderMacro (reader, name) {
  reader.next();
  const object = readForm(reader);
  return new MalList([new MalSymbol(name), object]);
}

function readWithMetaReaderMacro (reader) {
  reader.next();
  const metadata = readForm(reader);
  const object = readForm(reader);
  return new MalList([new MalSymbol('with-meta'), object, metadata]);
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
  return new MalList(readListContent(reader, ')'));
}

function readVector (reader) {
  return new MalVector(readListContent(reader, ']'));
}

function * pairwise (array) {
  for (let i = 0; i < array.length; i += 2) {
    yield array.slice(i, i + 2);
  }
}

function readHashMap (reader) {
  const items = readListContent(reader, '}');
  if (items.length % 2 !== 0) {
    throw new Error('Map literal must contain an even number of forms');
  }
  return new MalHashMap(new Map(pairwise(items)));
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
  const re = /[\s,]*(~@|[[\]{}()'`~^@]|"(?:\\.|[^\\"])*"?|;.*|[^\s[\]{}('"`,;)]*)/g;
  let match = re.exec(str);
  while (match[1] !== '') {
    yield match[1];
    match = re.exec(str);
  }
}

export function readString (input) {
  return readForm(new Reader(tokenizer(input)));
}
