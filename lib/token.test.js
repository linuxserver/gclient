const { clientOptions } = require('./options');
const { decrypt } = require('./utils');
const { makeToken } = require('./token');

const { crypt: { key, cypher } } = clientOptions;

test('generates a token', () => {
  const token = makeToken({
    username: 'abc',
    password: 'abc',
  });

  const encrypted = JSON.parse(Buffer.from(token, 'base64').toString('utf-8'));
  expect(JSON.parse(decrypt(encrypted.value, cypher, key, encrypted.iv))).toEqual({
    connection: {
      type: 'rdp',
      settings: {
        hostname: '127.0.0.1',
        port: '3389',
        security: 'any',
        'ignore-cert': true,
        username: 'abc',
        password: 'abc',
      },
    },
  });
});

test('fails if the config object is improperly formed', () => {
  expect(() => {
    makeToken({
      foo: 'bar',
    });
  }).toThrow(/username/);

  expect(() => {
    makeToken({
      username: 'bar',
    });
  }).toThrow(/password/);
});

test('fails if the token is not base64 encoded', () => {
  const token = makeToken({
    username: 'abc',
    password: 'abc',
  });

  expect(Buffer.from(token, 'base64').toString('base64')).toBe(token);
});
