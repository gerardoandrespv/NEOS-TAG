const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Log de requests
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
    next();
});

// ========== RUTAS GET ==========
app.get("/", (req, res) => {
    res.json({
        message: "🚀 NEOS Central Control API",
        version: "1.0.0",
        endpoints: {
            auth: {
                register: "POST /api/v1/auth/register",
                login: "POST /api/v1/auth/login"
            },
            test: "GET /api/v1/test"
        }
    });
});

app.get("/api/v1/test", (req, res) => {
    res.json({
        success: true,
        message: "API funcionando correctamente",
        timestamp: new Date().toISOString()
    });
});

// ========== RUTAS POST (AUTENTICACIÓN) ==========
app.post("/api/v1/auth/register", (req, res) => {
    console.log("📦 Body recibido:", req.body);
    
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
        return res.status(400).json({
            success: false,
            error: "Faltan campos requeridos",
            required: ["email", "password", "name"]
        });
    }
    
    // Simulación de usuario creado
    const user = {
        id: Date.now(),
        email,
        name,
        role: "viewer",
        createdAt: new Date().toISOString()
    };
    
    res.status(201).json({
        success: true,
        message: "Usuario registrado exitosamente",
        data: {
            user,
            token: `neos-jwt-${Date.now()}`
        }
    });
});

app.post("/api/v1/auth/login", (req, res) => {
    console.log("🔐 Login attempt:", req.body);
    
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({
            success: false,
            error: "Email y contraseña son requeridos"
        });
    }
    
    res.json({
        success: true,
        message: "Inicio de sesión exitoso",
        data: {
            user: {
                id: 1,
                email,
                name: "Usuario NEOS",
                role: "admin"
            },
            token: `neos-jwt-login-${Date.now()}`
        }
    });
});

// Manejo de errores 404
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: "Ruta no encontrada",
        path: req.path,
        method: req.method,
        hint: req.method === "GET" && req.path.includes("/auth/") 
            ? "Esta ruta requiere método POST" 
            : "Verifica el método y la ruta"
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
========================================
🚀 NEOS CENTRAL CONTROL API
========================================
✅ Servidor corriendo en: http://localhost:${PORT}
📅 Iniciado: ${new Date().toLocaleString()}

📋 ENDPOINTS DISPONIBLES:
   GET  /              - Información de la API
   GET  /api/v1/test   - Prueba de funcionamiento
   POST /api/v1/auth/register - Registrar usuario
   POST /api/v1/auth/login    - Iniciar sesión
========================================
    `);
});
