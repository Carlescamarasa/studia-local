import { createClient } from '@base44/sdk';
// import { getAccessToken } from '@base44/sdk/utils/auth-utils';

// Create a client with authentication required
export const base44 = createClient({
  appId: "6913f837bb2b72a49b9d25d1", 
  requiresAuth: true // Ensure authentication is required for all operations
});
