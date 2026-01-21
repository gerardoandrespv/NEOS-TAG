╔══════════════════════════════════════════════════════╗
║         SISTEMA RFID - CONDOMINIO NEOS TECH         ║
║                 ACTUALIZACIÓN v3.1                  ║
╠══════════════════════════════════════════════════════╣
║                                                      ║
║  📅 Fecha actualización: 20-01-2026 07:38      ║
║  🔧 Versión: 3.1 (Estructura Firestore Corregida)   ║
║                                                      ║
║  🌐 DASHBOARD WEB:                                   ║
║     • URL Principal: https://neos-tech.web.app/      ║
║     • URL Alternativa: https://neos-tech.firebaseapp.com/ ║
║                                                      ║
║  🔧 ESTRUCTURA DE DATOS CORREGIDA:                  ║
║     • Campo REAL: epc (antes buscaba tag_id)        ║
║     • Campo REAL: reader_sn (antes buscaba reader_id)║
║     • Campo REAL: timestamp (string ISO)            ║
║     • Campo REAL: location                          ║
║                                                      ║
║  📊 ESTADÍSTICAS ACTUALES:                          ║
║     • Documentos en Firestore: 277                  ║
║     • Lector activo: C38B25120811C6                 ║
║     • Ubicación principal: gate_1                   ║
║                                                      ║
║  🔗 ENLACES ADMINISTRATIVOS:                        ║
║     • Firebase Console: https://console.firebase.google.com/project/neos-tech/ ║
║     • Firestore: https://console.firebase.google.com/project/neos-tech/firestore ║
║     • Hosting: https://console.firebase.google.com/project/neos-tech/hosting ║
║     • Cloud Functions: https://console.cloud.google.com/functions/list?project=neos-tech ║
║                                                      ║
║  🚀 COMANDOS ÚTILES:                                ║
║     • Actualizar dashboard: firebase deploy --only hosting ║
║     • Ver logs: firebase hosting:clone             ║
║     • Abrir dashboard: start https://neos-tech.web.app/ ║
║                                                      ║
║  📁 ARCHIVOS ACTUALIZADOS:                          ║
║     • index_corrected.html → index.html             ║
║     • dashboard_corrected.js → dashboard.js         ║
║     • style_corrected.css → style.css               ║
║                                                      ║
╚══════════════════════════════════════════════════════╝

📋 CAMBIOS REALIZADOS:
1. ✅ Dashboard ahora lee la estructura REAL de Firestore:
   • epc (Tag ID real) en lugar de tag_id
   • reader_sn en lugar de reader_id  
   • timestamp como string ISO
   • location como ubicación

2. ✅ Interfaz mejorada con:
   • Estadísticas en tiempo real
   • Filtros y búsqueda
   • Exportación a CSV
   • Actualización automática cada 30s

3. ✅ Desplegado en Firebase Hosting:
   • URL: https://neos-tech.web.app/
   • Cache optimizado
   • SSL automático

4. ✅ Accesos rápidos creados:
   • Acceso directo en escritorio
   • Esta documentación

🎯 PRÓXIMOS PASOS:
1. Verificar que los datos se muestren correctamente (sin "N.A")
2. Probar con lectores RFID físicos
3. Configurar alertas o notificaciones si es necesario
4. Monitorear uso y rendimiento

⚠️  TROUBLESHOOTING:
• Si aún ves "N.A", verifica la consola del navegador (F12 → Console)
• Si hay errores de Firebase, verifica las credenciales en firebase-config.js
• Si la tabla está vacía, verifica que haya datos en Firestore

📞 SOPORTE:
• Proyecto Firebase: neos-tech
• Email: gerardoandrespv@gmail.com
• Dashboard: https://neos-tech.web.app/
