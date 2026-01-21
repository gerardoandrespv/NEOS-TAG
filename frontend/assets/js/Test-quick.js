// test-quick.js - Prueba rápida de la API
const axios = require('axios');

async function quickTest() {
    console.log('🚀 Probando API NEOS...');
    
    try {
        // Probar endpoints básicos
        const endpoints = [
            'http://localhost:3000',
            'http://localhost:3000/health',
            'http://localhost:3000/api/v1/test',
            'http://localhost:3000/api/v1/system/info'
        ];
        
        for (const url of endpoints) {
            try {
                const response = await axios.get(url);
                console.log(\`✅ \${url}: \${response.status}\`);
            } catch (error) {
                console.log(\`❌ \${url}: \${error.message}\`);
            }
        }
    } catch (error) {
        console.error('Error:', error.message);
    }
}

quickTest();
