const request = require('supertest');
const app = require('../src/app');

describe('Auth Endpoints', () => {
  it('POST /auth/login should reject missing credentials', async () => {
    const res = await request(app).post('/auth/login').send({});
    expect(res.status).toBe(400);
  });

  it('POST /auth/forgot-password should reject missing identifier', async () => {
    const res = await request(app).post('/auth/forgot-password').send({});
    expect(res.status).toBe(400);
  });
});
