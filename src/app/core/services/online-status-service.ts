import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class OnlineStatusService {
  readonly #isOnline = signal(navigator.onLine);
  readonly isOnline = this.#isOnline.asReadonly();

  constructor() {
    window.addEventListener('online', () => this.#isOnline.set(true));
    window.addEventListener('offline', () => this.#isOnline.set(false));
  }
}