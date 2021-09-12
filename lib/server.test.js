const { JSDOM } = require('jsdom');
const request = require('supertest');

const { clientOptions } = require('./options');
const utils = require('./utils');

const { crypt: { key, cypher } } = clientOptions;

jest.setTimeout(20000);
jest.mock('node-linux-pam');
// Mock out cloudcmd completely. Something in the way that
// jest executes tests doesn't completely close something
// in the cloudcmd internals, leaving open handles which
// jest complains about. Because we don't care to test
// cloudcmd, we just mock out the 200 it would respond with
// and go about our business.
jest.mock('cloudcmd', () => () => (req, res) => {
  res.status(200).end();
});

// eslint-disable-next-line import/order
const { pamAuthenticate } = require('node-linux-pam');

const { app } = require('./server');

beforeEach(() => {
  pamAuthenticate.mockReset();
});

const server = request(app);

test('the server launches correctly', () => server.get('/')
  .expect(200)
  .expect('Content-Type', 'text/html; charset=utf-8')
  .expect((data) => {
    const { window: { document: { body } } } = new JSDOM(data.text);

    const token = body.querySelector('#connectionstring');
    const encrypted = JSON.parse(Buffer.from(token.value, 'base64').toString('utf-8'));
    const decrypted = JSON.parse(utils.decrypt(encrypted.value, cypher, key, encrypted.iv));

    expect(decrypted).toEqual({
      connection: {
        type: 'rdp',
        settings: {
          hostname: '127.0.0.1',
          'ignore-cert': true,
          port: '3389',
          security: 'any',
          username: 'abc',
          password: 'abc',
        },
      },
    });
    const baseUrl = body.querySelector('#baseurl');
    expect(baseUrl.value).toBe('/');
  }));

test('static resources are loaded correctly', () => server.get('/')
  .expect(200)
  .expect('Content-Type', 'text/html; charset=utf-8')
  .expect((data) => {
    const { window: { document: { head } } } = new JSDOM(data.text);
    const links = head.querySelectorAll('link');

    // Iterate over all the <link> elements and ensure we get a 200 back
    links.forEach(async (el) => {
      await request(app).get(el.href)
        .expect(200);
    });
  }));

test('GET: /files is unauthorized', () => server.get('/files')
  .expect(401, 'Unauthorized'));

test('POST: /files is unauthorized without creds', () => server.post('/files')
  .expect(401, 'Unauthorized'));

test('POST: /files is authorized with valid creds', () => {
  pamAuthenticate.mockImplementation((data, cb) => cb(null));

  return server.post('/files')
    .send({ password: 'abc' })
    .expect(200);
});

test('POST: /files is unauthorized with incorrect creds', () => {
  pamAuthenticate.mockImplementation((data, cb) => cb(new Error('some  error')));

  return server.post('/files')
    .send({ password: 'abc' })
    .expect(401, 'Unauthorized');
});
