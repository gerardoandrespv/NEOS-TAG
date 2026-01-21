"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
// Configurar variables de entorno
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middlewares básicos
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Rutas básicas
app.get("/", (req, res) => {
    res.json({
        message: " NEOS Central Control Backend",
        version: "1.0.0",
        status: "running",
        timestamp: new Date().toISOString(),
        endpoints: {
            health: "/health",
            api: "/api/v1"
        }
    });
});
app.get("/health", (req, res) => {
    res.json({
        status: "healthy",
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});
// Ruta 404
app.use((req, res) => {
    res.status(404).json({
        error: "Ruta no encontrada",
        path: req.path
    });
});
// Iniciar servidor
app.listen(PORT, () => {
    console.log(`
    
       NEOS CENTRAL CONTROL BACKEND   
    
     URL: http://localhost:${PORT}
     Iniciado: ${new Date().toLocaleString()}
     Entorno: ${process.env.NODE_ENV || "development"}
    `);
});
