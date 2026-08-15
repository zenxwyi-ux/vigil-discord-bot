const LEVELS = { DEBUG: 0, INFO: 1, WARN: 2, ERROR: 3 };
const level = LEVELS[process.env.LOG_LEVEL || 'INFO'] ?? LEVELS.INFO;

const color = (c, s) => `\x1b[${c}m${s}\x1b[0m`;

export const logger = {
  debug: (...a) => level <= LEVELS.DEBUG && console.log(color(90, '[dbg]'), ...a),
  info: (...a) => level <= LEVELS.INFO && console.log(color(36, '[info]'), ...a),
  warn: (...a) => level <= LEVELS.WARN && console.log(color(33, '[warn]'), ...a),
  error: (...a) => level <= LEVELS.ERROR && console.log(color(31, '[error]'), ...a),
};