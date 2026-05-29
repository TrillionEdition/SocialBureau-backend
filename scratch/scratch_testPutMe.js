/**
 * Diagnostic: Test PUT /me to see what innovations the backend saves and returns.
 * Run with: node scratch_testPutMe.js
 * 
 * NOTE: Replace TOKEN with a valid JWT from the browser localStorage.
 *       Open the dashboard, open DevTools > Console, and type:
 *       localStorage.getItem('token')
 */
const axios = require('axios');

const TOKEN = process.argv[2]; // Pass token as first argument
if (!TOKEN) {
  console.error('\nUsage: node scratch_testPutMe.js <YOUR_JWT_TOKEN>\n');
  process.exit(1);
}

const API_URL = 'http://localhost:5000';

async function main() {
  // 1. GET current profile
  console.log('--- STEP 1: GET /team-v2/me ---');
  try {
    const getRes = await axios.get(`${API_URL}/team-v2/me`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const data = getRes.data.data;
    const user = data.user || {};
    console.log('Profile fetched. user.innovations =', JSON.stringify(user.innovations, null, 2));

    // 2. PUT with one test innovation included
    console.log('\n--- STEP 2: PUT /team-v2/me with a test innovation ---');
    const putPayload = {
      ...data,
      ...user, // Spread user fields so they are top-level in the body
      innovations: [
        {
          type: 'INSIGHT',
          date: '2026-05-22',
          title: 'PUT /me test innovation',
          content: 'This was written by the diagnostic script.',
          url: '',
          likes: 0,
          comments: 0
        }
      ]
    };
    console.log('Sending PUT payload. innovations =', JSON.stringify(putPayload.innovations, null, 2));

    const putRes = await axios.put(`${API_URL}/team-v2/me`, putPayload, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const putData = putRes.data.data;
    const putUser = putData.user || {};
    console.log('\nPUT response user.innovations =', JSON.stringify(putUser.innovations, null, 2));

    // 3. GET again to confirm persistence
    console.log('\n--- STEP 3: GET /team-v2/me again to verify ---');
    const getRes2 = await axios.get(`${API_URL}/team-v2/me`, {
      headers: { Authorization: `Bearer ${TOKEN}` }
    });
    const data2 = getRes2.data.data;
    const user2 = data2.user || {};
    console.log('After PUT, user.innovations =', JSON.stringify(user2.innovations, null, 2));
  } catch (err) {
    console.error('Error:', err.response?.data || err.message);
  }
}

main();
