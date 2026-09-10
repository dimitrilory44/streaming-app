import { Component, computed, effect, inject, linkedSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { TmdbApiService } from '@core/services/tmdb-api';
import { TmdbImagePipe } from '@shared/pipes/tmdb-image.pipe';

import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { IconChipComponent } from '@shared/components/icon-chip/icon-chip';
import { DecimalPipe } from '@angular/common';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { SwiperDirective } from '@shared/directives/swiper.directive';
import { Provider } from '@core/models/media-model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';
import { OnlineStatusService } from '@core/services/online-status.service';
import { MatInputModule } from '@angular/material/input';
import { toSignal } from '@angular/core/rxjs-interop';
import { StateMessage } from "@shared/components/state-message/state-message";
import { sortById } from '@shared/helpers/collection.helpers';

@Component({
  selector: 'app-provider-settings',
  imports: [TmdbImagePipe, MatDialogModule, MatButtonModule, MatChipsModule, MatIconModule, MatCheckboxModule, MatFormFieldModule, FormsModule, ReactiveFormsModule, IconChipComponent, DecimalPipe, SwiperDirective, MatProgressSpinnerModule, ImgFallbackDirective, MatInputModule, StateMessage],
  templateUrl: './title-filter-provider-config.html',
  styleUrl: './title-filter-provider-config.scss',
})
export class TitleFilterProviderConfigComponent {
  readonly #dialogRef = inject(MatDialogRef<TitleFilterProviderConfigComponent>);
  readonly #tmdbApiService = inject(TmdbApiService);
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #onlineStatus = inject(OnlineStatusService);

  readonly isOnline = this.#onlineStatus.isOnline;
  readonly mediaType = this.#tmdbApiService.mediaType;

  readonly providersMovies = this.#tmdbApiService.getProvidersMovies();
  readonly providersSeries = this.#tmdbApiService.getProvidersSeries();

  searchControl = new FormControl('', { nonNullable: true });
  readonly searchTerm = toSignal(this.searchControl.valueChanges, { initialValue: '' });

  readonly selectedProviders = linkedSignal<Provider[]>(() => this.#userPreferencesService.providerHelpers.items());
  // TOFIX : lié à la gestion du count helpers
  readonly countProvidersSelected = computed(() => this.selectedProviders().length);
  readonly hasSelectionProviders = computed(() => this.selectedProviders().length > 0);
  readonly actionsClose = computed(() => this.hasSelectionProviders() ? 'Terminé' : 'Veuillez sélectionner au moins 1 service');

  readonly areAllProvidersSelected = computed<boolean>(() => {
    const response = this.allProviders();
    if (response.length === 0) return false;
    return response.every(p => this.selectedProviders().some(sp => sp.provider_id === p.provider_id));
  });

  readonly partiallyComplete = computed<boolean>(() => {
    return this.selectedProviders().length > 0 && !this.areAllProvidersSelected();
  });

  readonly allProviders = computed<Provider[]>(() => {
    const providersMoviesResults = this.providersMovies.value()?.results ?? [];
    const providersSeriesResults = this.providersSeries.value()?.results ?? [];

    return Array.from(
      new Map(
        [...providersMoviesResults, ...providersSeriesResults].map(provider => [
          provider.provider_id,
          provider
        ])
      ).values()
    );
  });

  readonly filteredProviders = computed<Provider[]>(() => {
    const term = this.searchTerm().toLowerCase();
    const data = this.allProviders();
    if (!data) return [];
    return data.filter(p => p.provider_name.toLowerCase().includes(term));
  });

  readonly hasError = computed(() => {
    return this.providersMovies.error() || this.providersSeries.error();
  });

  readonly isLoadingInitial = computed(() => {
    return this.providersMovies.isLoading() || this.providersSeries.isLoading();
  });

  readonly swiperConfig = {
    slidesPerView: 'auto' as const,
    spaceBetween: 16,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    }
  };

  isSelected(id: number): boolean {
    return this.selectedProviders().some(p => p.provider_id === id);
  }

  toggleProvider(provider: Provider): void {
    const current = this.selectedProviders();
    const exists = current.some(p => p.provider_id === provider.provider_id);
    const updated = exists
      ? current.filter(p => p.provider_id !== provider.provider_id)
      : [...current, provider];
    this.selectedProviders.set(sortById(updated));
  }

  toggleAllProviders(): void {
    const response = this.allProviders();
    if (response.length === 0) return;
    this.selectedProviders.set(this.areAllProvidersSelected() ? [] : sortById(response));
  }

  removeProvider(id: number): void {
    this.selectedProviders.set(this.selectedProviders().filter(p => p.provider_id !== id));
  }

  cleanInput(): void {
    this.searchControl.setValue('');
  }

  onRetry(): void {
    const type = this.mediaType();
    if (type === 'all' || type === 'movie') this.providersMovies.reload();
    if (type === 'all' || type === 'tv') this.providersSeries.reload();
  }

  constructor() {
    effect(() => {
      this.#dialogRef.disableClose = !this.hasSelectionProviders();
    })

    this.#dialogRef.beforeClosed().subscribe(() => {
      this.#userPreferencesService.setSelectedProviders(this.selectedProviders());
    });
  }
  
}
