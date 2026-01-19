
import { authService } from '../services/auth.service.js';
import prisma from '../lib/prisma.js';

async function main() {
  console.log('--- Debug Refresh Token Flow ---');

  const email = `debug-${Date.now()}@example.com`;
  const password = 'Password123!';

  console.log(`1. Registering user: ${email}`);
  const { user } = await authService.register({
    email,
    password,
    name: 'Debug User',
    username: `debug${Date.now()}`,
  });
  
  // Verify email manually so we can login
  await prisma.user.update({
      where: { id: user.id },
      data: { emailVerified: true }
  });

  console.log('2. Logging in...');
  const loginResult = await authService.login({
    email,
    password,
  });

  console.log('   Access Token:', loginResult.accessToken.substring(0, 20) + '...');
  console.log('   Refresh Token:', loginResult.refreshToken);

  console.log('3. Waiting 2 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 2000));

  console.log('4. Attempting refresh...');
  const refreshResult = await authService.rotateRefreshToken(loginResult.refreshToken);

  if (refreshResult) {
    console.log('✅ Refresh successful!');
    console.log('   New Access Token:', refreshResult.accessToken.substring(0, 20) + '...');
    console.log('   New Refresh Token:', refreshResult.refreshToken);
  } else {
    console.error('❌ Refresh FAILED. Check backend logs for details.');
  }
}

main()
  .catch((e) => console.error(e))
  .finally(async () => {
    await prisma.$disconnect();
  });
