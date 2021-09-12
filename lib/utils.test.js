const fs = require('fs');
const utils = require('./utils');

jest.mock('fs');

describe('encrypt/decrypt', () => {
  const key = '*whisper* mysecretkey! *whisper*';
  const plaintext = 'THIS IS MY PASSWORD!';
  const algorithm = 'AES-256-CBC';

  test('it encrypts and decrypts plaintext', () => {
    const token = utils.encrypt(plaintext, algorithm, key);
    const encrypted = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const decrypted = utils.decrypt(encrypted.value, algorithm, key, encrypted.iv);
    expect(JSON.parse(decrypted)).toEqual(plaintext);
  });

  test('it encrypts and decrypts objects', () => {
    const expected = {
      foo: 'bar',
      baz: {
        qux: ['quux', 3],
        quuz: 12,
      },
      corge: null,
    };
    const token = utils.encrypt(expected, algorithm, key);
    const encrypted = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    const decrypted = utils.decrypt(encrypted.value, algorithm, key, encrypted.iv);
    expect(JSON.parse(decrypted)).toEqual(expected);
  });

  test('it carries the ciphertext value and iv in the encoded payload', () => {
    const token = utils.encrypt(plaintext, algorithm, key);
    const encrypted = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    expect(new Set(Object.keys(encrypted))).toEqual(new Set(['value', 'iv']));
  });

  test('iv, value, and token are all base64 encoded', () => {
    const token = utils.encrypt(plaintext, algorithm, key);
    // Base64 round-trip the token
    expect(Buffer.from(token, 'base64').toString('base64')).toBe(token);

    const encrypted = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
    expect(Buffer.from(encrypted.value, 'base64').toString('base64')).toBe(encrypted.value);
    expect(Buffer.from(encrypted.iv, 'base64').toString('base64')).toBe(encrypted.iv);
  });
});

describe('trimTrailingSlash', () => {
  test('it trims a trailing slash', () => {
    expect(utils.trimTrailingSlash('foo/')).toBe('foo');
  });

  test('it doesn\'t trim anything from a string without a trailing slash', () => {
    expect(utils.trimTrailingSlash('foo')).toBe('foo');
  });

  test('it only removes a slash from the very end of a string', () => {
    expect(utils.trimTrailingSlash('/foo/')).toBe('/foo');
  });

  test('it trims one slash from double slashes', () => {
    expect(utils.trimTrailingSlash('//')).toBe('/');
  });
});

describe('deepMerge', () => {
  test('it merges two objects together', () => {
    expect(utils.deepMerge({
      foo: 3,
      bar: {
        baz: [1, 2],
        quiz: 'lux',
      },
    }, {
      bar: {
        foo: {},
      },
    })).toEqual({
      foo: 3,
      bar: {
        baz: [1, 2],
        quiz: 'lux',
        foo: {},
      },
    });
  });

  test('it doesn\'t mutate original objects', () => {
    const a = {
      foo: 3,
      bar: {
        baz: [1, 2],
        quiz: 'lux',
      },
    };

    const b = {
      bar: {
        foo: {},
      },
    };

    expect(utils.deepMerge(a, b)).toEqual({
      foo: 3,
      bar: {
        baz: [1, 2],
        quiz: 'lux',
        foo: {},
      },
    });

    expect(a).toEqual({
      foo: 3,
      bar: {
        baz: [1, 2],
        quiz: 'lux',
      },
    });

    expect(b).toEqual({
      bar: {
        foo: {},
      },
    });
  });

  test('it respects Object.assign rules for conflicts', () => {
    expect(utils.deepMerge({
      foo: 3,
      bar: {
        baz: [1, 2],
        quiz: 'lux',
      },
    }, {
      foo: 'wut',
      bar: {
        baz: [3],
      },
    })).toEqual({
      foo: 'wut',
      bar: {
        baz: [3],
        quiz: 'lux',
      },
    });
  });
});

describe('loadConfig', () => {
  const existsSyncMock = fs.existsSync;
  const readFileSyncMock = fs.readFileSync;

  const fakeDirectory = 'notAnActualDirectory';
  const expectedConfigFile = `${fakeDirectory}/config.json`;

  beforeEach(() => {
    existsSyncMock.mockReset();
    readFileSyncMock.mockReset();
  });

  test('it properly loads config from the filesystem', () => {
    // Mock calls to the FS
    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockReturnValueOnce(JSON.stringify({
      username: 'foo',
      password: 'bar',
    }));

    const config = utils.loadConfig(fakeDirectory);
    expect(config).toEqual({
      username: 'foo',
      password: 'bar',
    });

    expect(existsSyncMock).toHaveBeenCalledWith(expectedConfigFile);
    expect(existsSyncMock).toHaveBeenCalledTimes(1);
    expect(readFileSyncMock).toHaveBeenCalledWith(expectedConfigFile);
    expect(readFileSyncMock).toHaveBeenCalledTimes(1);
  });

  test('it provides default values if the config file is missing', () => {
    // Mock calls to the FS
    existsSyncMock.mockReturnValueOnce(false);

    const config = utils.loadConfig(fakeDirectory);
    expect(config).toEqual({
      username: 'abc',
      password: 'abc',
    });

    expect(existsSyncMock).toHaveBeenCalledWith(expectedConfigFile);
    expect(readFileSyncMock).toHaveBeenCalledTimes(0);
  });

  test('it throws if the config file isn\'t json', () => {
    // Mock calls to the FS
    existsSyncMock.mockReturnValueOnce(true);
    readFileSyncMock.mockReturnValueOnce('username=foo\npassword=bar');

    expect(() => {
      utils.loadConfig(fakeDirectory);
    }).toThrow();
  });
});
