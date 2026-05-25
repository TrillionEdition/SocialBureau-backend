const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../SocialBureau/src/pages/AdminTeamDashboard/index.jsx');
const content = fs.readFileSync(filePath, 'utf8');

const lines = content.split('\n');
const matches = [];
lines.forEach((line, i) => {
  if (line.includes('value={newMember.') || line.includes('value={editingMember.')) {
    matches.push({ lineNum: i + 1, content: line.trim() });
  }
});

console.log("Found inputs with values:", matches);
