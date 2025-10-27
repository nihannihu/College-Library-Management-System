const axios = require('axios');

async function testApi() {
  try {
    console.log('Testing books API endpoint...');
    const response = await axios.get('http://localhost:3000/api/books');
    console.log('Status:', response.status);
    console.log('Books count:', response.data.length);
    console.log('First book:', response.data[0]);
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
  }
}

testApi();