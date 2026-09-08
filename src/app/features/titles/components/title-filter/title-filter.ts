import { Component, computed, effect, inject, input, model, signal, WritableSignal } from '@angular/core';
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
import { AllSortOptions, CommonSortOptions, Media, MediaType, MovieSortOptions, TVSortOptions } from '@shared/types/collection.types';
import { TitleFilterProvidersComponent } from './title-filter-providers/title-filter-providers';
import { SortOption } from '@core/models/media-model';

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
  readonly countTitles = input<number>(0);
  readonly isLoading = input<boolean>(false);
  readonly currentMediaType = input<MediaType>('movie');

  readonly selectedFilter = model<MediaType>('movie');

  readonly selectedMovieSort = signal<MovieSortOptions>('popularity.desc');
  readonly selectedTVSort = signal<TVSortOptions>('popularity.desc');
  readonly selectedAllSort = signal<CommonSortOptions>('popularity.desc');

  readonly isFilterCriteriaPanelExpanded = signal(false);
  readonly isFilterProviderPanelExpanded = signal(false);
  readonly isSortExpanded = signal(false);

  readonly countProviders = this.#userPreferencesService.selectedCountProviders;
  readonly selectedProviders = this.#userPreferencesService.selectedProviders;

  readonly commonSortOptions: SortOption<CommonSortOptions>[] = [
    { value: 'popularity.desc', label: 'Popularité' },
    { value: 'vote_average.desc', label: 'Mieux notés' }
  ];

  readonly sortMovieOptions: SortOption<MovieSortOptions>[] = [
    ...this.commonSortOptions,
    { value: 'release_date.desc', label: 'Année de sortie' },
    { value: 'revenue.desc', label: 'Box-office' },
    { value: 'title.asc', label: 'Alphabétique' }
  ];

  readonly sortTVOptions: SortOption<TVSortOptions>[] = [
    ...this.commonSortOptions,
    { value: 'first_air_date.desc', label: 'Date de diffusion' },
    { value: 'name.asc', label: 'Alphabétique' },
  ];

  readonly sortOptionsByMedia: Record<MediaType, SortOption<AllSortOptions>[]> = {
    movie: this.sortMovieOptions,
    tv: this.sortTVOptions,
    all: this.commonSortOptions
  };

  readonly sortSelectedByMedia: Record<MediaType, WritableSignal<AllSortOptions>> = {
    movie: this.selectedMovieSort,
    tv: this.selectedTVSort,
    all: this.selectedAllSort
  };

  readonly selectOptionsByMedia = computed(() => {
    return this.sortOptionsByMedia[this.currentMediaType()];
  });

  readonly selectedOption = computed(() => {
    switch (this.currentMediaType()) {
      case 'movie': return this.selectedMovieSort();
      case 'tv': return this.selectedTVSort();
      default: return this.selectedAllSort();
    }
  });

  readonly activeSort = computed(() => {
    return this.selectedOption() !== this.#userPreferencesService.DEFAULT_SORT;
  });

  readonly activeCountFilters = computed(() => {
    let count = 0;
    count += this.#userPreferencesService.genreHelpers.count();
    count += this.#userPreferencesService.releaseDateHelpers.isDefault() ? 0 : 1;
    // autres : count += this.selectedYear() ? 1 : 0;
    return count;
  });

  getMediaTitle(value: MediaType) {
    switch (value) {
      case 'movie': return this.#router.navigate(['/popular/movies']);
      case 'tv': return this.#router.navigate(['/popular/series']);
      default: return this.#router.navigate(['/popular/all']);
    }
  }

  onFilterChange(value: MediaType): void {
    this.selectedFilter.set(value);
    this.getMediaTitle(value);
  }

  selectSort(value: AllSortOptions): void {
    this.sortSelectedByMedia[this.currentMediaType()].set(value);
    this.#userPreferencesService.setSelectedSort(value);
  }

  constructor() {
    effect(() => {
      switch (this.currentMediaType()) {
        case 'movie': return this.selectedFilter.set('movie');
        case 'tv': return this.selectedFilter.set('tv');
        default: return this.selectedFilter.set('all');
      }
    });
  }

}
