import readlineSync from 'readline-sync';

export function prompt (prompt) {
  return readlineSync.prompt({ prompt });
}

// import path from 'path';
// import fs from 'fs';
// import ffi from 'ffi';
//
// // IMPORTANT: choose one
// const RL_LIB = 'libreadline';  // NOTE: libreadline is GPL
// // const RL_LIB = 'libedit';
//
// const HISTORY_FILE = path.join(process.env.HOME, '.mal-history');
//
// const rllib = ffi.Library(RL_LIB, {
//   'readline': [ 'string', [ 'string' ] ],
//   'add_history': [ 'int', [ 'string' ] ]});
//
// let rlHistoryLoaded = false;
//
// export function prompt (question = 'user> ') {
//   if (!rlHistoryLoaded) {
//     rlHistoryLoaded = true;
//     let lines = [];
//     if (fs.existsSync(HISTORY_FILE)) {
//       lines = fs.readFileSync(HISTORY_FILE).toString().split('\n');
//     }
//     // Max of 2000 lines
//     lines = lines.slice(Math.max(lines.length - 2000, 0));
//     for (var i = 0; i < lines.length; i += 1) {
//       if (lines[i]) {
//         rllib.add_history(lines[i]);
//       }
//     }
//   }
//
//   var line = rllib.readline(question);
//   if (line) {
//     rllib.add_history(line);
//     try {
//       fs.appendFileSync(HISTORY_FILE, line + '\n');
//     } catch (exc) {
//         // ignored
//     }
//   }
//
//   return line;
// }
