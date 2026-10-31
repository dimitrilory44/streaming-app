import { Component, inject, OnDestroy, signal } from '@angular/core';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { LoadingBar } from '@shared/components/loading-bar/loading-bar';
import { TitleHeaderComponent } from '@features/titles/components/title-header/title-header';
import { filter } from 'rxjs';
import { MatTabNavPanel } from '@angular/material/tabs';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TitleHeaderComponent, LoadingBar, MatTabNavPanel],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnDestroy {
  readonly #router = inject(Router);
  
  readonly title = signal('app-film');
  readonly isNavigating = signal(false);
  readonly isOnline = signal(navigator.onLine);

  readonly onOnline = () => this.isOnline.set(true);
  readonly onOffline = () => this.isOnline.set(false);

  constructor() {
    this.#router.events
      .pipe(
        filter(
          (event) =>
            event instanceof NavigationStart ||
            event instanceof NavigationEnd ||
            event instanceof NavigationCancel ||
            event instanceof NavigationError
        )
      )
      .subscribe((event) => {
        this.isNavigating.set(event instanceof NavigationStart);
      });
      
    window.addEventListener('online', this.onOnline);
    window.addEventListener('offline', this.onOffline);
  }

  ngOnDestroy(): void {
    window.removeEventListener('online', this.onOnline);
    window.removeEventListener('offline', this.onOffline);
  }
}
