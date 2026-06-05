const axios = require('axios');

async function check() {
  try {
    const res = await axios.get('http://localhost:5000/team-v2');
    const reshma = res.data.data.find(m => m.slug === 'reshma-vijayan' || m.id === 'reshma' || m.email?.includes('webjr'));
    const athira = res.data.data.find(m => m.slug === 'athira-rajesh' || m.id === 'athira' || m.email?.includes('pmo'));
    
    console.log("RESHMA:", JSON.stringify(reshma, null, 2));
    console.log("ATHIRA:", JSON.stringify(athira, null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

check();
