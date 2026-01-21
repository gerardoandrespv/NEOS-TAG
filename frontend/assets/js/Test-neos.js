const axios = require("axios");

async function testNeosAPI() {
    console.log("🧪 INICIANDO PRUEBAS NEOS API");
    console.log("=".repeat(50));
    
    try {
        // 1. Test endpoint básico
        console.log("1. Probando endpoint básico...");
        const testRes = await axios.get("http://localhost:3000/api/v1/test");
        console.log("✅ Test OK:", testRes.data.message);
        
        // 2. Registrar usuario
        console.log("\n2. Registrando usuario...");
        const registerRes = await axios.post("http://localhost:3000/api/v1/auth/register", {
            email: "demo@neos.com",
            password: "Demo123!",
            name: "Demo User"
        });
        console.log("✅ Registro exitoso!");
        console.log("   Token:", registerRes.data.data.token);
        console.log("   Usuario ID:", registerRes.data.data.user.id);
        
        // 3. Iniciar sesión
        console.log("\n3. Iniciando sesión...");
        const loginRes = await axios.post("http://localhost:3000/api/v1/auth/login", {
            email: "demo@neos.com",
            password: "Demo123!"
        });
        console.log("✅ Login exitoso!");
        console.log("   Token:", loginRes.data.data.token);
        console.log("   Rol:", loginRes.data.data.user.role);
        
        console.log("\n" + "=".repeat(50));
        console.log("🎉 TODAS LAS PRUEBAS PASARON CORRECTAMENTE");
        
    } catch (error) {
        console.log("\n❌ ERROR EN PRUEBAS:");
        if (error.response) {
            console.log("Status:", error.response.status);
            console.log("Error:", error.response.data);
        } else {
            console.log("Error:", error.message);
        }
    }
}

testNeosAPI();
