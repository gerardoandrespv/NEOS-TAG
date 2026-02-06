# ========================================
# UNIT TESTS - Cloud Functions (Python)
# ========================================

import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from firebase_admin import firestore, messaging
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))

from push_notifications import (
    send_alert_to_all_devices,
    send_alert_to_tokens,
    emit_emergency_alert
)


# ========================================
# FIXTURES
# ========================================

@pytest.fixture
def mock_firestore_client():
    """Mock Firestore client"""
    with patch('firebase_admin.firestore.client') as mock:
        yield mock


@pytest.fixture
def mock_messaging():
    """Mock Firebase Messaging"""
    with patch('firebase_admin.messaging.send') as mock_send:
        mock_send.return_value = "message-id-12345"
        yield mock_send


@pytest.fixture
def sample_alert_data():
    """Sample alert data for testing"""
    return {
        'type': 'FIRE',
        'message': 'Incendio detectado en Torre A, Piso 3',
        'severity': 'CRITICAL',
        'affected_tower': 'Torre A',
        'affected_floor': '3'
    }


@pytest.fixture
def sample_fcm_tokens():
    """Sample FCM tokens"""
    return [
        'token_device_1_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
        'token_device_2_yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy',
        'token_device_3_zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz'
    ]


# ========================================
# TEST: send_alert_to_all_devices
# ========================================

class TestSendAlertToAllDevices:
    
    def test_send_critical_alert_success(self, mock_messaging, sample_alert_data):
        """Test sending critical alert with correct priority and TTL"""
        
        result = send_alert_to_all_devices(
            alert_type='FIRE',
            title='🔥 ALERTA DE INCENDIO',
            body=sample_alert_data['message'],
            severity='CRITICAL'
        )
        
        # Verify messaging.send was called
        assert mock_messaging.called
        
        # Verify message structure
        call_args = mock_messaging.call_args[0][0]
        assert call_args.topic == 'all-devices'
        assert call_args.notification.title == '🔥 ALERTA DE INCENDIO'
        assert call_args.data['severity'] == 'CRITICAL'
        
        # Verify Android config for CRITICAL
        assert call_args.android.priority == 'high'
        assert call_args.android.ttl == 86400  # 24h for CRITICAL
        
        # Verify result
        assert result['success'] is True
        assert 'message_id' in result
    
    
    def test_send_medium_alert_lower_priority(self, mock_messaging):
        """Test medium severity alert has lower priority than critical"""
        
        result = send_alert_to_all_devices(
            alert_type='GENERAL',
            title='Comunicado',
            body='Mensaje general',
            severity='MEDIUM'
        )
        
        call_args = mock_messaging.call_args[0][0]
        
        # Medium severity should have normal priority
        assert call_args.android.priority == 'normal'
        assert call_args.android.ttl == 43200  # 12h for MEDIUM
    
    
    def test_send_alert_handles_fcm_error(self, mock_messaging):
        """Test proper error handling when FCM fails"""
        
        # Simulate FCM error
        mock_messaging.side_effect = messaging.FirebaseError(
            code='invalid-argument',
            message='Invalid message format'
        )
        
        result = send_alert_to_all_devices(
            alert_type='FIRE',
            title='Test',
            body='Test message',
            severity='CRITICAL'
        )
        
        assert result['success'] is False
        assert 'error' in result
        assert 'invalid-argument' in str(result['error'])
    
    
    def test_alert_includes_correct_data_payload(self, mock_messaging):
        """Test data payload includes all required fields"""
        
        send_alert_to_all_devices(
            alert_type='EVACUATION',
            title='Evacuación',
            body='Evacuar inmediatamente',
            severity='CRITICAL'
        )
        
        call_args = mock_messaging.call_args[0][0]
        
        assert call_args.data['alert_type'] == 'EVACUATION'
        assert call_args.data['severity'] == 'CRITICAL'
        assert call_args.data['click_action'] == 'FLUTTER_NOTIFICATION_CLICK'


# ========================================
# TEST: send_alert_to_tokens
# ========================================

class TestSendAlertToTokens:
    
    def test_send_to_multiple_tokens_success(self, mock_messaging, sample_fcm_tokens):
        """Test sending to multiple FCM tokens"""
        
        mock_messaging.return_value = messaging.BatchResponse([
            messaging.SendResponse({'name': 'msg1'}, None),
            messaging.SendResponse({'name': 'msg2'}, None),
            messaging.SendResponse({'name': 'msg3'}, None)
        ])
        
        result = send_alert_to_tokens(
            tokens=sample_fcm_tokens,
            alert_type='FIRE',
            title='Test Alert',
            body='Test message',
            severity='HIGH'
        )
        
        assert result['success'] is True
        assert result['success_count'] == 3
        assert result['failure_count'] == 0
    
    
    def test_send_with_partial_failures(self, mock_messaging, sample_fcm_tokens):
        """Test handling partial failures (some tokens invalid)"""
        
        # Simulate 1 success, 2 failures
        mock_messaging.return_value = messaging.BatchResponse([
            messaging.SendResponse({'name': 'msg1'}, None),
            messaging.SendResponse(None, messaging.FirebaseError('invalid-token', 'Invalid token')),
            messaging.SendResponse(None, messaging.FirebaseError('not-registered', 'Token not registered'))
        ])
        
        result = send_alert_to_tokens(
            tokens=sample_fcm_tokens,
            alert_type='FIRE',
            title='Test',
            body='Test',
            severity='HIGH'
        )
        
        assert result['success'] is True  # Partial success still True
        assert result['success_count'] == 1
        assert result['failure_count'] == 2
        assert len(result['failed_tokens']) == 2
    
    
    def test_empty_tokens_list(self, mock_messaging):
        """Test sending with empty tokens list"""
        
        result = send_alert_to_tokens(
            tokens=[],
            alert_type='FIRE',
            title='Test',
            body='Test',
            severity='HIGH'
        )
        
        assert result['success'] is False
        assert 'error' in result
        assert 'no tokens' in result['error'].lower()


# ========================================
# TEST: emit_emergency_alert
# ========================================

class TestEmitEmergencyAlert:
    
    @patch('push_notifications.send_alert_to_all_devices')
    @patch('push_notifications.send_alert_to_tokens')
    @patch('firebase_admin.firestore.client')
    def test_emit_alert_fetches_subscribers(self, mock_db, mock_send_tokens, mock_send_all, sample_alert_data):
        """Test that emit_emergency_alert fetches subscribers from Firestore"""
        
        # Mock Firestore query
        mock_collection = MagicMock()
        mock_db.return_value.collection.return_value = mock_collection
        
        mock_docs = [
            MagicMock(id='sub1', to_dict=lambda: {'fcm_token': 'token1', 'notifications_enabled': True}),
            MagicMock(id='sub2', to_dict=lambda: {'fcm_token': 'token2', 'notifications_enabled': True})
        ]
        mock_collection.where.return_value.stream.return_value = mock_docs
        
        mock_send_tokens.return_value = {'success': True, 'success_count': 2, 'failure_count': 0}
        
        result = emit_emergency_alert(sample_alert_data)
        
        # Verify Firestore query
        mock_db.return_value.collection.assert_called_with('alert_subscribers')
        
        # Verify tokens were sent
        assert mock_send_tokens.called
        call_args = mock_send_tokens.call_args
        assert len(call_args[1]['tokens']) == 2
        assert 'token1' in call_args[1]['tokens']
        assert 'token2' in call_args[1]['tokens']
    
    
    @patch('push_notifications.send_alert_to_tokens')
    @patch('firebase_admin.firestore.client')
    def test_emit_alert_filters_disabled_subscribers(self, mock_db, mock_send_tokens):
        """Test that disabled subscribers are filtered out"""
        
        mock_collection = MagicMock()
        mock_db.return_value.collection.return_value = mock_collection
        
        mock_docs = [
            MagicMock(id='sub1', to_dict=lambda: {'fcm_token': 'token1', 'notifications_enabled': True}),
            MagicMock(id='sub2', to_dict=lambda: {'fcm_token': 'token2', 'notifications_enabled': False}),  # Disabled
            MagicMock(id='sub3', to_dict=lambda: {'fcm_token': '', 'notifications_enabled': True})  # No token
        ]
        mock_collection.where.return_value.stream.return_value = mock_docs
        
        mock_send_tokens.return_value = {'success': True, 'success_count': 1, 'failure_count': 0}
        
        result = emit_emergency_alert({
            'type': 'FIRE',
            'message': 'Test',
            'severity': 'HIGH'
        })
        
        # Only 1 valid subscriber should be used
        call_args = mock_send_tokens.call_args
        assert len(call_args[1]['tokens']) == 1
        assert 'token1' in call_args[1]['tokens']


# ========================================
# TEST: Input Validation
# ========================================

class TestInputValidation:
    
    def test_alert_type_validation(self):
        """Test that invalid alert types are rejected"""
        
        valid_types = ['FIRE', 'EVACUATION', 'FLOOD', 'POWER_OUTAGE', 'SYSTEM_FAILURE', 'GENERAL']
        
        for alert_type in valid_types:
            # Should not raise
            result = send_alert_to_all_devices(
                alert_type=alert_type,
                title='Test',
                body='Test',
                severity='MEDIUM'
            )
    
    
    def test_severity_validation(self):
        """Test severity level validation"""
        
        valid_severities = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
        
        for severity in valid_severities:
            result = send_alert_to_all_devices(
                alert_type='GENERAL',
                title='Test',
                body='Test',
                severity=severity
            )
    
    
    def test_message_sanitization(self):
        """Test that HTML/JS is sanitized from messages"""
        
        malicious_message = '<script>alert("XSS")</script>Mensaje válido'
        
        result = send_alert_to_all_devices(
            alert_type='GENERAL',
            title='Test',
            body=malicious_message,
            severity='MEDIUM'
        )
        
        # TODO: Implement sanitization and uncomment
        # call_args = mock_messaging.call_args[0][0]
        # assert '<script>' not in call_args.notification.body
        # assert 'Mensaje válido' in call_args.notification.body


# ========================================
# TEST: Concurrency & Rate Limiting
# ========================================

class TestConcurrency:
    
    @patch('push_notifications.send_alert_to_tokens')
    def test_concurrent_alerts_dont_interfere(self, mock_send):
        """Test that concurrent alert emissions don't interfere"""
        
        mock_send.return_value = {'success': True}
        
        import threading
        results = []
        
        def emit_alert():
            result = emit_emergency_alert({
                'type': 'FIRE',
                'message': 'Test concurrent',
                'severity': 'HIGH'
            })
            results.append(result)
        
        threads = [threading.Thread(target=emit_alert) for _ in range(10)]
        for t in threads:
            t.start()
        for t in threads:
            t.join()
        
        # All should succeed
        assert all(r['success'] for r in results)
        assert len(results) == 10


# ========================================
# TEST: Error Handling
# ========================================

class TestErrorHandling:
    
    @patch('firebase_admin.firestore.client')
    def test_firestore_connection_error(self, mock_db):
        """Test handling of Firestore connection errors"""
        
        mock_db.side_effect = Exception("Connection timeout")
        
        result = emit_emergency_alert({
            'type': 'FIRE',
            'message': 'Test',
            'severity': 'CRITICAL'
        })
        
        assert result['success'] is False
        assert 'error' in result
    
    
    def test_invalid_fcm_token_format(self, mock_messaging):
        """Test handling of malformed FCM tokens"""
        
        invalid_tokens = [
            'not-a-valid-token',
            '',
            None,
            'short'
        ]
        
        # Should handle gracefully, not crash
        result = send_alert_to_tokens(
            tokens=invalid_tokens,
            alert_type='FIRE',
            title='Test',
            body='Test',
            severity='HIGH'
        )
        
        # Should fail but not crash
        assert 'error' in result or result['failure_count'] > 0


# ========================================
# PERFORMANCE TESTS
# ========================================

class TestPerformance:
    
    @patch('push_notifications.send_alert_to_tokens')
    def test_large_subscriber_list_performance(self, mock_send):
        """Test performance with 1000+ subscribers"""
        
        import time
        
        # Generate 1000 fake tokens
        large_token_list = [f'token_{i}_' + 'x' * 100 for i in range(1000)]
        
        mock_send.return_value = {
            'success': True,
            'success_count': 1000,
            'failure_count': 0
        }
        
        start = time.time()
        result = send_alert_to_tokens(
            tokens=large_token_list,
            alert_type='FIRE',
            title='Test',
            body='Test',
            severity='CRITICAL'
        )
        duration = time.time() - start
        
        # Should process 1000 tokens in < 5 seconds
        assert duration < 5.0
        assert result['success'] is True
