const express = require('express');
const app = express();
const PORT = 3000;

// Middleware para parsear JSON
app.use(express.json());

// Ruta raíz
app.get('/', (req, res) => {
    res.json({ message: 'NEOS API funcionando', status: 'ok' });
});

// Ruta de prueba
app.get('/api/v1/test', (req, res) => {
    res.json({ 
        success: true, 
        message: 'Test endpoint',
        endpoints: [
            'GET /',
            'GET /api/v1/test',
            'POST /api/v1/auth/register',
            'POST /api/v1/auth/login'
        ]
    });
});

// Registro de usuario
app.post('/api/v1/auth/register', (req, res) => {
    console.log('Registro recibido:', req.body);
    
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            message: 'Faltan campos requeridos'
        });
    }
    
    res.status(201).json({
        success: true,
        message: 'Usuario registrado',
        data: {
            user: { id: 1, email, name },
            token: 'jwt-simulado-123'
        }
    });
});

// Login
app.post('/api/v1/auth/login', (req, res) => {
    console.log('Login recibido:', req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            message: 'Faltan credenciales'
        });
    }
    
    res.json({
        success: true,
        message: 'Login exitoso',
        data: {
            user: { id: 1, email, name: 'Test User' },
            token: 'jwt-simulado-456'
        }
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor NEOS corriendo en http://localhost:${PORT}`);
    console.log(`📅 ${new Date().toLocaleString()}\n`);
});
