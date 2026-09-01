import { registerSW } from 'virtual:pwa-register';

/**
 * Registra il service worker. Con `registerType: 'autoUpdate'` gli aggiornamenti
 * vengono applicati automaticamente alla navigazione successiva.
 */
export function registerServiceWorker(): void {
  registerSW({ immediate: true });
}
