const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf-8').split('\n').reduce((acc, line) => {
  const match = line.match(/^([^=]+)=[\"']?([^\"']+)[\"']?$/);
  if (match) acc[match[1]] = match[2];
  return acc;
}, {});

fetch(env.VITE_SUPABASE_URL + '/functions/v1/delete-user-data', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + env.VITE_SUPABASE_ANON_KEY
  }
}).then(async r => {
  console.log("Status:", r.status);
  console.log("Body:", await r.text());
}).catch(e => console.error(e));
