/**
 * Diagnostic: Test the full save/reload cycle without a browser.
 * This simulates exactly what the Staff Dashboard frontend does.
 * 
 * Run with: node scratch_fullCycleTest.js <JWT_TOKEN>
 * 
 * To get your token, open the team dashboard, open DevTools > Console, type:
 *    localStorage.getItem('token')
 */
const axios = require('axios');

const TOKEN = process.argv[2];
if (!TOKEN) {
  console.error('\nUsage: node scratch_fullCycleTest.js <YOUR_JWT_TOKEN>\n');
  process.exit(1);
}

const API = 'http://localhost:5000';
const headers = { Authorization: `Bearer ${TOKEN}` };

async function main() {
  try {
    // STEP 1: GET current profile
    console.log('\n=== STEP 1: GET /team-v2/me ===');
    const getRes = await axios.get(`${API}/team-v2/me`, { headers });
    const raw = getRes.data.data;
    
    console.log('response.data.data type:', typeof raw);
    console.log('response.data.data.user type:', typeof raw.user);
    console.log('response.data.data.user.innovations:', JSON.stringify(raw.user?.innovations, null, 2));
    
    // Simulate what fetchProfile does:
    const userObj = raw.user || {};
    console.log('\nuserObj.innovations:', JSON.stringify(userObj.innovations, null, 2));

    // STEP 2: PUT with innovations included (same as handleSubmit sends)
    console.log('\n=== STEP 2: PUT /team-v2/me (simulating form submit) ===');
    
    const testInnovation = {
      type: 'CASE STUDY',
      date: 'May 22, 2026',
      title: 'Browser PUT Test',
      content: 'Checking if innovations persist when sent via PUT /me endpoint.',
      url: 'https://example.com',
      likes: 5,
      comments: 2
    };
    
    // Build the payload exactly like TeamDashboard does
    const payload = {
      // TeamMember fields
      name: raw.name,
      role: raw.role,
      bgText: raw.bgText,
      description: raw.description,
      image: raw.image,
      cardImage: raw.cardImage,
      image1: raw.image1,
      tags: raw.tags || [],
      category: raw.category || [],
      bgColor: raw.bgColor,
      hasBakedText: raw.hasBakedText,
      socials: raw.socials || { linkedin: '', instagram: '', twitter: '' },
      isPublic: raw.isPublic !== undefined ? raw.isPublic : false,
      // User fields from userObj
      coverImage: userObj.coverImage || '',
      idCard: userObj.idCard || '',
      location: userObj.location || '',
      phone: userObj.phone || '',
      clickupId: userObj.clickupId || '',
      emp_id: userObj.emp_id || '',
      doj: userObj.doj ? new Date(userObj.doj).toISOString().split('T')[0] : '',
      rate: userObj.rate || '',
      tools: userObj.tools || [],
      clients: userObj.clients || [],
      achievements: userObj.achievements || [],
      podcasts: userObj.podcasts || [],
      events: userObj.events || [],
      hobbies: userObj.hobbies || [],
      // The innovations field we care about
      innovations: [testInnovation]
    };
    
    console.log('Sending payload.innovations:', JSON.stringify(payload.innovations, null, 2));
    
    const putRes = await axios.put(`${API}/team-v2/me`, payload, { headers });
    console.log('PUT success:', putRes.data.success);
    console.log('PUT response user.innovations:', JSON.stringify(putRes.data.data?.user?.innovations, null, 2));
    
    // STEP 3: GET again to verify persistence
    console.log('\n=== STEP 3: GET /team-v2/me again (verify persistence) ===');
    const getRes2 = await axios.get(`${API}/team-v2/me`, { headers });
    const raw2 = getRes2.data.data;
    const userObj2 = raw2.user || {};
    console.log('After PUT, userObj.innovations:', JSON.stringify(userObj2.innovations, null, 2));
    
  } catch (err) {
    if (err.response) {
      console.error('HTTP Error:', err.response.status, JSON.stringify(err.response.data, null, 2));
    } else {
      console.error('Error:', err.message);
    }
  }
}

main();
