import * as types from './types.mjs';

function makeReadable (string) {
  return string.replace(/[\\"\n]/g, character => {
    switch (character) {
      case '\n': return '\\n';
      default: return `\\${character}`;
    }
  });
}

function printCollectionContent (items, printReadably = false) {
  return items.map(item => printString(item, printReadably)).join(' ');
}

export function printString (malType, printReadably = false) {
  if (malType === types.NIL) {
    return 'nil';
  } else if (malType === types.TRUE) {
    return 'true';
  } else if (malType === types.FALSE) {
    return 'false';
  } else if (types.isList(malType)) {
    return `(${printCollectionContent(types.toJsArray(malType), printReadably)})`;
  } else if (types.isVector(malType)) {
    return `[${printCollectionContent(types.toJsArray(malType), printReadably)}]`;
  } else if (types.isHashMap(malType)) {
    const flattenedItems = [].concat(...types.toJsMap(malType).entries());
    return `{${printCollectionContent(flattenedItems, printReadably)}}`;
  } else if (types.isSymbol(malType)) {
    return types.getSymbolName(malType);
  } else if (types.isKeyword(malType)) {
    return `:${types.getKeywordName(malType)}`;
  } else if (types.isNumber(malType)) {
    return String(types.toJsNumber(malType));
  } else if (types.isString(malType)) {
    const strValue = types.toJsString(malType);
    return printReadably ? `"${makeReadable(strValue)}"` : strValue;
  } else if (types.isFunction(malType)) {
    return '#';
  } else if (types.isAtom(malType)) {
    return `(atom ${printString(types.deref(malType), printReadably)})`;
  } else {
    return malType.toString(printReadably);
  }
}
