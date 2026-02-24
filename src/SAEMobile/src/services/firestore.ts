import firestore from '@react-native-firebase/firestore';
import {EmergencyAlert} from '../types';

export function subscribeToAlerts(
  clientId: string,
  onUpdate: (alerts: EmergencyAlert[]) => void,
  onError: (error: Error) => void,
): () => void {
  const unsubscribe = firestore()
    .collection('emergency_alerts')
    .where('clientId', '==', clientId)
    .where('status', '==', 'ACTIVE')
    .orderBy('created_at', 'desc')
    .onSnapshot(
      snapshot => {
        const alerts: EmergencyAlert[] = snapshot.docs.map(doc => ({
          id: doc.id,
          ...(doc.data() as Omit<EmergencyAlert, 'id'>),
        }));
        onUpdate(alerts);
      },
      error => onError(error),
    );
  return unsubscribe;
}
