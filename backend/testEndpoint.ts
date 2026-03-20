const axios = require('axios');
const fs = require('fs');

async function testEndpoint() {
    try {
        const formData = new FormData();
        // create a dummy image buffer
        const buffer = Buffer.from('dummy image content');
        formData.append('image', new Blob([buffer]), 'test.png');
        formData.append('message', 'What is this?');

        const response = await fetch('http://localhost:5000/api/ai/image-chat', {
            method: 'POST',
            body: formData,
            headers: {
                // Assuming we don't have a valid authToken, it might fail auth first, 
                // so let's bypass auth locally in aiRoutes temporarily or generate a mock token.
            }
        });
        console.log("Status:", response.status);
        console.log("Data:", await response.text());
    } catch (err) {
        console.error("Fetch Error:", err.message);
    }
}
testEndpoint();
