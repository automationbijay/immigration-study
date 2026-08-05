// test_direct_api.js
const fs = require('fs');
const path = require('path');

const CV_PARSER_API_KEY = "cvp_live_FFagItmCN3DjuNLpB5bq0dpcdOrwYrao6Kq4PNPtYo";

async function run() {
  const filePath = path.join(__dirname, 'two-column-resume-template-blue.pdf');
  const fileContent = fs.readFileSync(filePath);

// Static URL from catbox
  const publicUrl = "https://files.catbox.moe/3xdyoi.pdf";
  console.log("Public URL being used:", publicUrl);
  
  console.log("\n2. Calling cvparser-api.com GraphQL endpoint...");
  
  const response = await fetch("https://api.cvparser-api.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": CV_PARSER_API_KEY,
    },
    body: JSON.stringify({
      query: "mutation($url:String!){ processCV(url:$url) }",
      variables: {
        url: publicUrl
      }
    })
  });

  const apiResult = await response.json();
  console.log("\n✅ API SUCCESS: Parsing Result");
  console.log(JSON.stringify(apiResult, null, 2));
}

run().catch(console.error);
