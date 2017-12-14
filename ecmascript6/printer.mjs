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

function makeReadable (stringValue) {
  return stringValue.replace(/[\\"\n]/g, character => `\\${character}`);
}

export function printString (malType, printReadably = false) {
  switch (malType.constructor) {
    case MalList:
      return `(${malType.items.map(printString).join(' ')})`;
    case MalSymbol:
      return malType.name;
    case MalNumber:
      return String(malType.value);
    case MalVector:
      return `[${malType.items.map(printString).join(' ')}]`;
    case MalHashMap:
      const flattenedItems = [].concat(...malType.items.entries());
      return `{${flattenedItems.map(printString).join(' ')}}`;
    case MalNil:
      return 'nil';
    case MalTrue:
      return 'true';
    case MalFalse:
      return 'false';
    case MalString:
      const stringValue = printReadably ? makeReadable(malType.value) : malType.value;
      return `"${stringValue}"`;
    case MalKeyword:
      return `:${malType.name}`;
    default:
      throw new Error(`Unrecognized type "${malType.constructor.name}"`);
  }
}
