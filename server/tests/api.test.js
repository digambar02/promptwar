const request = require('supertest');
const app = require('../index'); // We export app from index.js for testing

// Mock firebase-admin
jest.mock('firebase-admin', () => {
  return {
    initializeApp: jest.fn(),
    credential: { cert: jest.fn() },
    firestore: jest.fn(() => ({
      collection: jest.fn(() => ({
        add: jest.fn().mockResolvedValue({ id: 'mock-id' }),
        where: jest.fn(() => ({
          orderBy: jest.fn(() => ({
            get: jest.fn().mockResolvedValue({ forEach: jest.fn() })
          })),
          get: jest.fn().mockResolvedValue({ forEach: jest.fn() })
        }))
      }))
    })),
    auth: jest.fn(() => ({
      verifyIdToken: jest.fn().mockResolvedValue({ uid: 'mock-uid' })
    }))
  };
});

// Mock GoogleGenAI
jest.mock('@google/genai', () => {
  return {
    GoogleGenAI: jest.fn().mockImplementation(() => ({
      models: {
        generateContent: jest.fn().mockResolvedValue({
          text: JSON.stringify([
            {
              title: "Mocked Title",
              description: "Mocked Description",
              duration: "Week 1",
              icon: "book"
            }
          ])
        })
      }
    }))
  };
});

describe('POST /api/roadmap Security & Validation', () => {
  
  beforeEach(() => {
    process.env.GEMINI_API_KEY = "test_key";
  });

  it('should return 401 if token is missing', async () => {
    const res = await request(app)
      .post('/api/roadmap')
      .send({});
    expect(res.statusCode).toEqual(401);
  });

  it('should return 400 if age is missing or invalid with valid token', async () => {
    const res = await request(app)
      .post('/api/roadmap')
      .set('Authorization', 'Bearer mock-token')
      .send({
        education: "Graduate",
        currentWork: "Engineer",
        domain: "Tech",
        interest: "React",
        weeks: 4
      });
    expect(res.statusCode).toEqual(400);
    expect(res.body.error).toContain('Age must be a valid number');

    const resInvalid = await request(app)
      .post('/api/roadmap')
      .set('Authorization', 'Bearer mock-token')
      .send({
        age: 150, // Invalid age
        education: "Graduate",
        currentWork: "Engineer",
        domain: "Tech",
        interest: "React",
        weeks: 4
      });
    expect(resInvalid.statusCode).toEqual(400);
  });

  it('should return 200 and mocked roadmap for valid input', async () => {
    const res = await request(app)
      .post('/api/roadmap')
      .set('Authorization', 'Bearer mock-token')
      .send({
        age: 25,
        education: "Graduate",
        currentWork: "Engineer",
        domain: "Tech",
        interest: "React",
        weeks: 1
      });
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.roadmap).toBeDefined();
    expect(res.body.roadmap[0].title).toEqual("Mocked Title");
    expect(res.body.id).toEqual("mock-id"); // Confirms Firestore mock was called
  });
});

describe('GET /api/history', () => {
  it('should return history with valid token', async () => {
    const res = await request(app)
      .get('/api/history')
      .set('Authorization', 'Bearer mock-token');
    
    expect(res.statusCode).toEqual(200);
    expect(res.body.history).toBeDefined();
  });
});
