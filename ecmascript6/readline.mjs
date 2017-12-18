import readlineSync from 'readline-sync';

export function prompt (prompt) {
  return readlineSync.prompt({ prompt });
}
