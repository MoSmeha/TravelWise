import { authService } from '../services/auth.service.js';

import * as argon2 from 'argon2';

async function testRegister() {
  try {
    const input = {
      email: `test-${Date.now()}@example.com`,
      password: 'Password123!',
      name: 'Test User',
      username: `testuser_${Date.now()}`,
    };


    console.log('Argon2 object keys:', Object.keys(argon2));
    // @ts-ignore
    console.log('Argon2.default keys:', argon2.default ? Object.keys(argon2.default) : 'no default');
    // @ts-ignore
    console.log('Argon2.default.argon2id:', argon2.default?.argon2id);
    console.log('Argon2.argon2id:', argon2.argon2id);

    console.log('Attempting to register:', input);
    const result = await authService.register(input);
    console.log('Registration successful:', result);
  } catch (error: any) {
    console.error('Registration failed:', error);
    console.error('Error message:', error.message);
  } finally {
    process.exit();
  }
}

testRegister();
