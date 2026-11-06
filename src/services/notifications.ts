import { NotificationItem } from '../types';
import { playNotificationTone, playScoreChime } from './sound';

const SYNC_CHANNEL_NAME = 'SPORTS_TOURNAMENT_SYNC_CHANNEL';
let broadcastChannel: BroadcastChannel | null = null;

try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel(SYNC_CHANNEL_NAME);
  }
} catch (e) {
  console.warn('BroadcastChannel not supported:', e);
}

type SyncCallback = (data: { type: string; payload: unknown }) => void;
const syncListeners: Set<SyncCallback> = new Set();

if (broadcastChannel) {
  broadcastChannel.onmessage = (event) => {
    syncListeners.forEach((callback) => callback(event.data));
  };
}

export function subscribeToSync(callback: SyncCallback): () => void {
  syncListeners.add(callback);
  return () => {
    syncListeners.delete(callback);
  };
}

export function broadcastTournamentUpdate(type: string, payload: unknown) {
  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage({ type, payload });
    } catch (e) {
      console.warn('Broadcast postMessage failed:', e);
    }
  }
}

/**
 * Request Browser Push / System Notification Permission
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

/**
 * Dispatch a smart push notification (both System Web Notification and Sound)
 */
export function sendSmartNotification(
  title: string,
  message: string,
  type: NotificationItem['type'] = 'score'
): NotificationItem {
  const item: NotificationItem = {
    id: 'NOTIF_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
    timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
    title,
    message,
    type,
    read: false,
  };

  // Play audio cue
  if (type === 'score') {
    playScoreChime();
  } else {
    playNotificationTone();
  }

  // System desktop / mobile push notification if supported and granted
  if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: message,
        icon: '/icon.svg',
      });
    } catch (e) {
      console.debug('Notification display error:', e);
    }
  }

  // Broadcast to other tabs
  broadcastTournamentUpdate('NOTIFICATION_ADDED', item);

  return item;
}
