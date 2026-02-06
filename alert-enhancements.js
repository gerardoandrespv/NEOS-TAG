// Sistema mejorado de confirmaciones de alertas
// Agregar este código al index.html

// Variables globales para alertas
window.activeAlerts = new Map();
window.alertSoundIntervals = new Map();

// Función mejorada para confirmar alertas
async function confirmAlertReceptionEnhanced(alertId, buttonElement) {
    try {
        console.log('[Alerts] Confirmando recepción de alerta:', alertId);
        
        // Deshabilitar botón
        if (buttonElement) {
            buttonElement.disabled = true;
            buttonElement.textContent = '✓ Confirmado';
            buttonElement.style.opacity = '0.6';
        }
        
        // Marcar como confirmada
        const alert = activeAlerts.get(alertId);
        if (alert) {
            alert.confirmed = true;
        }
        
        // Detener sonido repetido
        const soundInterval = alertSoundIntervals.get(alertId);
        if (soundInterval) {
            clearInterval(soundInterval);
            alertSoundIntervals.delete(alertId);
        }
        
        // Guardar confirmación en Firestore
        if (currentUser) {
            await db.collection('alert_confirmations').add({
                alert_id: alertId,
                user_id: currentUser.uid,
                user_email: currentUser.email,
                confirmed_at: firebase.firestore.FieldValue.serverTimestamp(),
                device: navigator.userAgent
            });
            
            console.log('[Alerts] ✅ Confirmación guardada en Firestore');
            
            // Actualizar contador en la alerta
            const alertRef = db.collection('emergency_alerts').doc(alertId);
            await alertRef.update({
                confirmations_count: firebase.firestore.FieldValue.increment(1)
            });
        }
        
        // Remover notificación después de 3 segundos
        setTimeout(() => {
            dismissAlert(alertId);
        }, 3000);
        
    } catch (error) {
        console.error('[Alerts] Error confirmando alerta:', error);
    }
}

function dismissAlert(alertId) {
    // Remover del DOM
    const notifDiv = document.getElementById(`alert-${alertId}`);
    if (notifDiv) {
        notifDiv.remove();
    }
    
    // Detener sonido
    const soundInterval = alertSoundIntervals.get(alertId);
    if (soundInterval) {
        clearInterval(soundInterval);
        alertSoundIntervals.delete(alertId);
    }
    
    // Remover de alertas activas
    activeAlerts.delete(alertId);
}

// Mostrar lista de alertas activas en el dashboard
function showActiveAlerts() {
    const container = document.createElement('div');
    container.innerHTML = `
        <div style="position: fixed; top: 100px; left: 280px; background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); padding: 20px; max-width: 400px; z-index: 1000;">
            <h3 style="margin: 0 0 15px 0; font-size: 18px; color: #333;">🚨 Alertas Activas (${activeAlerts.size})</h3>
            <div id="activeAlertsList"></div>
            <button onclick="this.closest('div').remove()" style="margin-top: 15px; padding: 8px 16px; background: #667eea; color: white; border: none; border-radius: 6px; cursor: pointer; width: 100%;">
                Cerrar
            </button>
        </div>
    `;
    
    const listDiv = container.querySelector('#activeAlertsList');
    
    if (activeAlerts.size === 0) {
        listDiv.innerHTML = '<p style="color: #666; font-size: 14px;">No hay alertas activas</p>';
    } else {
        activeAlerts.forEach((alert, alertId) => {
            const alertDiv = document.createElement('div');
            alertDiv.style.cssText = 'padding: 10px; background: #f8f9fa; border-radius: 6px; margin-bottom: 10px;';
            alertDiv.innerHTML = `
                <div style="font-weight: 600; font-size: 14px; color: #DC2626; margin-bottom: 4px;">
                    ${alert.notification?.title || 'Alerta de Emergencia'}
                </div>
                <div style="font-size: 13px; color: #666; margin-bottom: 6px;">
                    ${alert.notification?.body || ''}
                </div>
                <div style="font-size: 12px; color: #999;">
                    ${new Date(alert.timestamp).toLocaleTimeString('es-ES')}
                    ${alert.confirmed ? ' • ✓ Confirmada' : ' • Pendiente'}
                </div>
            `;
            listDiv.appendChild(alertDiv);
        });
    }
    
    document.body.appendChild(container);
}

// Listener para mostrar alertas activas con tecla rápida
document.addEventListener('keydown', (e) => {
    if (e.ctrlKey && e.key === 'a') {
        e.preventDefault();
        showActiveAlerts();
    }
});
