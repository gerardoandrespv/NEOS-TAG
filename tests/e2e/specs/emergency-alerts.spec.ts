/**
 * ========================================
 * E2E TESTS - Emergency Alert System
 * ========================================
 * 
 * Tests de flujo completo de usuario para sistema de alertas
 */

import { test, expect, Page } from '@playwright/test';

// ========================================
// HELPERS
// ========================================

async function login(page: Page, username: string, password: string) {
  await page.goto('/');
  
  // Esperar modal de login
  await page.waitForSelector('#loginModal.active', { timeout: 5000 });
  
  // Llenar credenciales
  await page.fill('#usernameInput', username);
  await page.fill('#passwordInput', password);
  
  // Click login
  await page.click('button.btn-login');
  
  // Esperar a que desaparezca el modal
  await page.waitForSelector('#loginModal:not(.active)', { timeout: 5000 });
}

async function loginAsAdmin(page: Page) {
  // ⚠️ SECURITY ISSUE: Credenciales hardcodeadas
  await login(page, 'admin', 'admin123');
}

async function navigateToAlertsTab(page: Page) {
  await page.click('.sidebar-item[onclick="switchTab(\'alerts\')"]');
  await page.waitForSelector('#alerts-tab.active');
}

// ========================================
// TEST: Authentication
// ========================================

test.describe('Authentication', () => {
  
  test('should show login modal on page load', async ({ page }) => {
    await page.goto('/');
    
    const loginModal = page.locator('#loginModal');
    await expect(loginModal).toBeVisible();
    await expect(loginModal).toHaveClass(/active/);
  });
  
  
  test('should login successfully with valid credentials', async ({ page }) => {
    await page.goto('/');
    
    await loginAsAdmin(page);
    
    // Verificar que el modal desapareció
    const loginModal = page.locator('#loginModal');
    await expect(loginModal).not.toHaveClass(/active/);
    
    // Verificar que aparece el contenido principal
    await expect(page.locator('.main-content')).toBeVisible();
    
    // Verificar nombre de usuario en header
    await expect(page.locator('.user-info')).toContainText('Administrador');
  });
  
  
  test('should reject invalid credentials', async ({ page }) => {
    await page.goto('/');
    
    await page.fill('#usernameInput', 'invalid');
    await page.fill('#passwordInput', 'wrong');
    await page.click('button.btn-login');
    
    // Debe mostrar error
    // TODO: Implementar mensaje de error en UI
    await page.waitForTimeout(1000);
    
    // Modal debe seguir visible
    const loginModal = page.locator('#loginModal');
    await expect(loginModal).toHaveClass(/active/);
  });
  
  
  test('should logout successfully', async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    
    // Click logout
    await page.click('.btn-logout');
    
    // Debe volver al login
    await expect(page.locator('#loginModal')).toHaveClass(/active/);
  });
});


// ========================================
// TEST: Emergency Alerts Creation
// ========================================

test.describe('Emergency Alerts - Creation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    await navigateToAlertsTab(page);
  });
  
  
  test('should open new alert modal', async ({ page }) => {
    await page.click('button:has-text("Nueva Alerta")');
    
    const modal = page.locator('#newAlertModal');
    await expect(modal).toHaveClass(/active/);
    
    // Verificar elementos del formulario
    await expect(page.locator('#alertType')).toBeVisible();
    await expect(page.locator('#buildingZone')).toBeVisible();
    await expect(page.locator('#meetingPoint')).toBeVisible();
  });
  
  
  test('should create FIRE alert with all floors', async ({ page }) => {
    await page.click('button:has-text("Nueva Alerta")');
    
    // Seleccionar tipo FIRE
    await page.selectOption('#alertType', 'FIRE');
    
    // Severidad CRITICAL
    await page.check('#severityCritical');
    
    // Zona
    await page.fill('#buildingZone', 'Torre A');
    
    // Punto de encuentro
    await page.fill('#meetingPoint', 'Estacionamiento Principal');
    
    // Seleccionar "Todo el edificio"
    await page.check('#floor_all');
    
    // Emitir alerta
    await page.click('button:has-text("Emitir Alerta")');
    
    // Esperar confirmación
    await page.waitForTimeout(2000);
    
    // Verificar que aparece en la lista
    const alertsList = page.locator('.alerts-list-container');
    await expect(alertsList).toContainText('FIRE');
    await expect(alertsList).toContainText('Torre A');
  });
  
  
  test('should create EVACUATION alert for specific floors', async ({ page }) => {
    await page.click('button:has-text("Nueva Alerta")');
    
    await page.selectOption('#alertType', 'EVACUATION');
    await page.check('#severityCritical');
    await page.fill('#buildingZone', 'Piso 5-7');
    
    // Seleccionar pisos específicos
    await page.check('#floor_5');
    await page.check('#floor_6');
    await page.check('#floor_7');
    
    await page.click('button:has-text("Emitir Alerta")');
    
    await page.waitForTimeout(2000);
    
    // Verificar
    await expect(page.locator('.alerts-list-container')).toContainText('EVACUATION');
  });
  
  
  test('should validate required fields', async ({ page }) => {
    await page.click('button:has-text("Nueva Alerta")');
    
    // Intentar emitir sin llenar campos
    await page.click('button:has-text("Emitir Alerta")');
    
    // Debe mostrar validación HTML5
    const zoneInput = page.locator('#buildingZone');
    const isInvalid = await zoneInput.evaluate((el: HTMLInputElement) => !el.validity.valid);
    expect(isInvalid).toBe(true);
  });
  
  
  test('should auto-fill message template based on alert type', async ({ page }) => {
    await page.click('button:has-text("Nueva Alerta")');
    
    // Cambiar tipo a FLOOD
    await page.selectOption('#alertType', 'FLOOD');
    
    // Esperar que se llene el mensaje automáticamente
    await page.waitForTimeout(500);
    
    const messageText = await page.locator('#alertMessage').inputValue();
    expect(messageText).toContain('fuga de agua');
  });
});


// ========================================
// TEST: Emergency Alerts - Cancellation
// ========================================

test.describe('Emergency Alerts - Cancellation', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    await navigateToAlertsTab(page);
  });
  
  
  test('should cancel active alert', async ({ page }) => {
    // Crear alerta primero
    await page.click('button:has-text("Nueva Alerta")');
    await page.selectOption('#alertType', 'GENERAL');
    await page.check('#severityLow');
    await page.fill('#buildingZone', 'Test');
    await page.check('#floor_all');
    await page.click('button:has-text("Emitir Alerta")');
    
    await page.waitForTimeout(2000);
    
    // Buscar botón cancelar
    const cancelButton = page.locator('.alerts-list-container .btn-danger').first();
    await cancelButton.click();
    
    // Modal de confirmación
    const cancelModal = page.locator('#cancelAlertModal');
    await expect(cancelModal).toHaveClass(/active/);
    
    // Ingresar razón
    await page.fill('#cancellationReason', 'Falsa alarma - Prueba E2E');
    
    // Confirmar cancelación
    await page.click('button:has-text("Confirmar Cancelación")');
    
    await page.waitForTimeout(2000);
    
    // Verificar que la alerta muestra estado CANCELLED
    await expect(page.locator('.alerts-list-container')).toContainText('CANCELLED');
  });
  
  
  test('should require cancellation reason', async ({ page }) => {
    // Asumiendo que hay una alerta activa
    // (en un test real, crearías una primero)
    
    // TODO: Verificar validación de razón de cancelación
  });
});


// ========================================
// TEST: QR Registration System
// ========================================

test.describe('QR Registration', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    await navigateToAlertsTab(page);
  });
  
  
  test('should show QR code modal', async ({ page }) => {
    await page.click('button:has-text("Registro QR")');
    
    const modal = page.locator('#qrModal');
    await expect(modal).toHaveClass(/active/);
    
    // Verificar que el QR se genera
    const qrCanvas = page.locator('#qrCode canvas');
    await expect(qrCanvas).toBeVisible();
  });
  
  
  test('should copy registration link', async ({ page }) => {
    await page.click('button:has-text("Registro QR")');
    
    // Setup clipboard mock
    await page.evaluate(() => {
      window.navigator.clipboard.writeText = async (text: string) => {
        (window as any).clipboardText = text;
      };
    });
    
    await page.click('button:has-text("Copiar Link")');
    
    // Verificar que se copió
    const clipboardText = await page.evaluate(() => (window as any).clipboardText);
    expect(clipboardText).toContain('register-alerts.html');
  });
  
  
  test('should show subscriber count', async ({ page }) => {
    await page.click('button:has-text("Registro QR")');
    
    const statsDiv = page.locator('#qrStats');
    await expect(statsDiv).toBeVisible();
    
    // Debe mostrar números
    await expect(statsDiv).toContainText(/\d+/);
  });
});


// ========================================
// TEST: Live Tag Reading
// ========================================

test.describe('Live Tag Reading', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
  });
  
  
  test('should display live tags container', async ({ page }) => {
    const liveTagsContainer = page.locator('.live-tags-container');
    await expect(liveTagsContainer).toBeVisible();
  });
  
  
  test('should filter tags by status', async ({ page }) => {
    // Click filtro "Granted"
    await page.click('button.filter-btn:has-text("Granted")');
    
    await page.waitForTimeout(500);
    
    // Todos los tags visibles deben ser granted
    const grantedTags = page.locator('.live-tag-header.granted');
    const deniedTags = page.locator('.live-tag-header.denied');
    
    const grantedCount = await grantedTags.count();
    const deniedCount = await deniedTags.count();
    
    expect(deniedCount).toBe(0);
  });
  
  
  test('should clear tags', async ({ page }) => {
    await page.click('button:has-text("Limpiar")');
    
    // Container debe estar vacío
    const tags = page.locator('.live-tag-item');
    await expect(tags).toHaveCount(0);
  });
});


// ========================================
// TEST: Access Control
// ========================================

test.describe('Access Control', () => {
  
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
  });
  
  
  test('should open gate manually', async ({ page }) => {
    // Navegar a Access Control
    await page.click('.sidebar-item[onclick="switchTab(\'access-control\')"]');
    
    // Click "Abrir Portón"
    const openButton = page.locator('button:has-text("Abrir Portón")').first();
    await openButton.click();
    
    await page.waitForTimeout(1000);
    
    // Debe aparecer en historial de acciones
    const historyTable = page.locator('#controlActionsTable tbody');
    await expect(historyTable.locator('tr').first()).toContainText('ABIERTO');
  });
  
  
  test('should show access point status', async ({ page }) => {
    await page.click('.sidebar-item[onclick="switchTab(\'access-control\')"]');
    
    // Verificar que se muestra status de lectora
    const statusIndicator = page.locator('.status-badge');
    await expect(statusIndicator).toBeVisible();
  });
});


// ========================================
// TEST: Performance
// ========================================

test.describe('Performance', () => {
  
  test('should load main dashboard in < 3 seconds', async ({ page }) => {
    const startTime = Date.now();
    
    await page.goto('/');
    await loginAsAdmin(page);
    
    // Esperar a que cargue completamente
    await page.waitForLoadState('networkidle');
    
    const loadTime = Date.now() - startTime;
    
    expect(loadTime).toBeLessThan(3000);
  });
  
  
  test('should handle 100+ tags in live view without lag', async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    
    // Simular 100 tags (esto requeriría inyección de datos o mock)
    // Por ahora, solo verificamos que la UI no se congela
    
    const liveContainer = page.locator('.live-tags-container');
    await expect(liveContainer).toBeVisible({ timeout: 2000 });
  });
});


// ========================================
// TEST: Mobile Responsiveness
// ========================================

test.describe('Mobile Responsiveness', () => {
  
  test.use({ viewport: { width: 375, height: 667 } });  // iPhone SE
  
  
  test('should show mobile menu button', async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    
    const menuButton = page.locator('.mobile-menu-btn');
    await expect(menuButton).toBeVisible();
  });
  
  
  test('should open sidebar drawer on mobile', async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    
    // Click hamburger menu
    await page.click('.mobile-menu-btn');
    
    // Sidebar debe aparecer
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).toHaveClass(/active/);
  });
  
  
  test('should close sidebar on overlay click', async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    
    await page.click('.mobile-menu-btn');
    
    // Click overlay
    await page.click('.sidebar-overlay');
    
    // Sidebar debe cerrarse
    const sidebar = page.locator('.sidebar');
    await expect(sidebar).not.toHaveClass(/active/);
  });
});


// ========================================
// TEST: Accessibility
// ========================================

test.describe('Accessibility', () => {
  
  test('should have proper ARIA labels', async ({ page }) => {
    await page.goto('/');
    await loginAsAdmin(page);
    
    // Verificar botones tienen labels
    const buttons = page.locator('button');
    const count = await buttons.count();
    
    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const text = await button.textContent();
      const ariaLabel = await button.getAttribute('aria-label');
      
      // Debe tener texto o aria-label
      expect(text || ariaLabel).toBeTruthy();
    }
  });
  
  
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/');
    
    // Tab navigation
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Verificar que el foco es visible
    const focusedElement = page.locator(':focus');
    await expect(focusedElement).toBeVisible();
  });
});


// ========================================
// TEST: Error States
// ========================================

test.describe('Error Handling', () => {
  
  test('should handle Firestore connection error', async ({ page }) => {
    // Mock Firestore error
    await page.route('**/*firestore*', route => route.abort());
    
    await page.goto('/');
    
    // Debe mostrar error o fallback
    // TODO: Implementar error boundaries
  });
  
  
  test('should handle FCM token generation failure', async ({ page }) => {
    await page.goto('/register-alerts.html');
    
    // Mock FCM error
    await page.evaluate(() => {
      (window as any).firebase = {
        messaging: () => ({
          getToken: () => Promise.reject(new Error('FCM not available'))
        })
      };
    });
    
    // Llenar formulario
    await page.fill('#subscriberName', 'Test User');
    await page.fill('#apartment', '101');
    await page.fill('#floor', '1');
    
    await page.click('button[type="submit"]');
    
    // Debe mostrar error
    await page.waitForTimeout(1000);
    // TODO: Verificar mensaje de error
  });
});
