import { Component, computed, effect, inject, input, model, signal } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatMenuModule } from '@angular/material/menu';

import { Router } from '@angular/router';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { TmdbImagePipe } from '@shared/pipes/tmdb-image.pipe';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';
import { TitleFilterCriteriaComponent } from '@features/titles/components/title-filter/title-filter-criteria/title-filter-criteria';
import { AllSortOptions, Media, MediaType } from '@shared/types/collection.types';
import { TitleFilterProvidersComponent } from './title-filter-providers/title-filter-providers';
import { MediaConfig } from '@core/models/media-model';
import { commonSortOptions, sortMovieOptions, sortTVOptions } from '@shared/constants/sort-options';

@Component({
  selector: 'title-filter',
  imports: [TmdbImagePipe, MatButtonToggleModule, DecimalPipe, SlicePipe, MatButtonModule, MatIconModule, MatExpansionModule, MatMenuModule, ImgFallbackDirective, TitleFilterProvidersComponent, TitleFilterCriteriaComponent],
  templateUrl: './title-filter.html',
  styleUrl: './title-filter.scss',
})
export class TitleFilterComponent {
  readonly #router = inject(Router);
  readonly #userPreferencesService = inject(UserPreferencesService);

  readonly items = input<Media[]>([]);
  readonly isLoading = input<boolean>(false);
  readonly countTitles = input<number>(0);
  readonly currentMediaType = input<MediaType>(this.#userPreferencesService.DEFAULT_MEDIA);

  readonly selectedFilter = model<MediaType>(this.#userPreferencesService.DEFAULT_MEDIA);
  readonly isFilterProviderPanelExpanded = signal(false);
  readonly isSortExpanded = signal(false);
  readonly isFilterCriteriaPanelExpanded = signal(false);

  readonly selectedProviders = computed(() => this.#userPreferencesService.providerHelpers.items());
  readonly countProviders = computed(() => this.#userPreferencesService.providerHelpers.count());

  readonly selectedOptionByMedia = computed(() => this.#userPreferencesService.sortHelpers[this.currentMediaType()].items());
  readonly activeSort = computed(() => !this.#userPreferencesService.sortHelpers[this.currentMediaType()].isDefault());
  
  readonly mediaConfig: Record<MediaType, MediaConfig> = {
    movie: { options: sortMovieOptions, route: ['/popular/movies'] },
    tv: { options: sortTVOptions, route: ['/popular/series'] },
    all: { options: commonSortOptions, route: ['/popular/all'] }
  };

  readonly selectOptionsByMedia = computed(() => this.mediaConfig[this.currentMediaType()].options);

  readonly activeCountFilters = computed(() => {
    let count = 0;
    count += this.#userPreferencesService.genreHelpers.count();
    count += this.#userPreferencesService.releaseDateHelpers.isDefault() ? 0 : 1;
    // TODO : autres
    return count;
  });

  onResetSortChange(value: AllSortOptions): void {
    this.#userPreferencesService.sortHelpers[this.currentMediaType()].set(value);
  }

  getMediaTitle(value: MediaType) {
    this.#router.navigate(this.mediaConfig[value].route);
  }

  onFilterChange(value: MediaType): void {
    this.selectedFilter.set(value);
    this.getMediaTitle(value);
  }

  selectSort(value: AllSortOptions): void {
    this.#userPreferencesService.sortHelpers[this.currentMediaType()].set(value);
  }

  constructor() {
    effect(() => {
      this.selectedFilter.set(this.currentMediaType());
    });
  }

}
