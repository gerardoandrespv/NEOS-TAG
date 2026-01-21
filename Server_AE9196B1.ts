import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Configurar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares básicos
app.use(cors());
app.use(express.json());

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