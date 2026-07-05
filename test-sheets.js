const apiKey = process.env.VITE_GOOGLE_SHEETS_API_KEY;
const sheetId = process.env.VITE_SPREADSHEET_ID;
const range = "'messages'!A1:Z1000";

async function test() {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${range}?key=${apiKey}`;
  console.log('Fetching:', url.replace(apiKey, 'HIDDEN'));

  const res = await fetch(url);
  const data = await res.json();

  console.log('Status:', res.status);
  console.log('Response:', JSON.stringify(data, null, 2));
}

test();
