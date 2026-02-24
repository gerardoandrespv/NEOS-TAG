export type AlertType =
  | 'FIRE'
  | 'FLOOD'
  | 'EVACUATION'
  | 'ROBBERY'
  | 'FIGHT'
  | 'POWER_OUTAGE'
  | 'GENERAL';

export type AlertSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
export type AlertStatus = 'ACTIVE' | 'CANCELLED';

export interface EmergencyAlert {
  id: string;
  type: AlertType;
  message: string;
  severity: AlertSeverity;
  status: AlertStatus;
  clientId: string;
  title?: string;
  created_at?: {toDate: () => Date} | null;
}

export type Screen = 'onboarding' | 'alerts';
