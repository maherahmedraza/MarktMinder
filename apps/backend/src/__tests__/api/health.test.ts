import request from 'supertest';
import { describe, it, expect } from 'vitest';
import app from '../../server'; // Adjust import based on where `app` is exported

describe('Health Check API', () => {
    it('should return 200 OK', async () => {
        // Note: This assumes `app` is exported and addressable. 
        // If the server starts listening on import, we might need to separate app definition from listening.
        // For now we assume standard integration pattern.
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('status', 'ok');
    });
});
