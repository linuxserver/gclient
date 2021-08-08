const crypto = require('crypto');

/**
 * Function needed to encrypt the token string for guacamole connections
 * @param {object} value - the value to encrypt
 * @param {string} algorithm - the algorithm to use to encrypt
 * @param {string} key - the key to encrypt
 * @returns {string} a base64 encoded string containing the encrypted data
 */
const encrypt = (value, algorithm, key) => {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  let crypted = cipher.update(JSON.stringify(value), 'utf8', 'base64');
  crypted += cipher.final('base64');

  return Buffer.from(JSON.stringify({
    iv: iv.toString('base64'),
    value: crypted,
  })).toString('base64');
};

/**
 * Normalizes a string that may or may not have a trailing slash (uri, path, etc.)
 * @param {string} str
 * @returns {string}
 */
const trimTrailingSlash = (str) => (str.charAt(str.length - 1) === '/' ? str.slice(0, -1) : str);

/**
 * Determines if the given param is an Object
 * @param {*} item
 * @returns {boolean}
 */
const isObject = (item) => (item && typeof item === 'object' && !Array.isArray(item));

/**
 * Deep-merges two objects without mutating either of the params
 * @param {object} target
 * @param {object} source
 * @returns {object}
 */
const deepMerge = (target, source) => {
  const output = Object.assign({}, target); // eslint-disable-line prefer-object-spread

  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach((key) => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = deepMerge(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }

  return output;
};

module.exports = {
  encrypt,
  trimTrailingSlash,
  deepMerge,
};
