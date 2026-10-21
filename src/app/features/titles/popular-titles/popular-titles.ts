import { Component, computed, effect, inject, input, linkedSignal, signal } from '@angular/core';
import { TitleFilterComponent } from '@features/titles/components/title-filter/title-filter';
import { TitleListComponent } from '@features/titles/components/title-list/title-list';
import { TmdbApiService } from '@core/services/tmdb-api';
import { MovieMedia, SeriesMedia } from '@core/models/media-model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StateMessage } from "@shared/components/state-message/state-message";
import { AllSortOptions, Media, MediaType } from '@shared/types/collection.types';
import { pick } from '@shared/helpers/collection.helpers';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { isCommonSort } from '@shared/constants/sort-options';
import { DEFAULT_SORT } from '@shared/constants/filter-preferences';
import { sortMerged } from '@shared/helpers/rating.helpers';

@Component({
  selector: 'popular-page',
  imports: [TitleFilterComponent, TitleListComponent, MatProgressSpinnerModule, StateMessage],
  templateUrl: './popular-titles.html',
  styleUrl: './popular-titles.scss',
})
export class PopularTitlesComponent {
  readonly #tmdbApiService = inject(TmdbApiService);
  readonly #userPreferencesService = inject(UserPreferencesService);

  readonly mediaType = input.required<MediaType>();
  readonly titles = signal<Media[]>([]);
  readonly isLoadingMore = signal(false);
  readonly loadMoreError = signal(false);

  readonly #filtersKey = computed(() =>
    JSON.stringify([this.#userPreferencesService.criteria(), this.#tmdbApiService.providersIds()])
  );

  readonly sortMenu = computed(() => this.#tmdbApiService.sortFilter(this.mediaType()));

  readonly #sortBy = computed<AllSortOptions>(() => {
    const sort = this.sortMenu();
    return this.mediaType() === 'all' && !isCommonSort(sort) ? DEFAULT_SORT : sort;
  });

  readonly currentPage = linkedSignal({
    source: () => ({ filters: this.#filtersKey(), sort: this.sortMenu() }),
    computation: () => 1,
  });

  readonly #needsMovies = computed(() => this.mediaType() !== 'tv');
  readonly #needsSeries = computed(() => this.mediaType() !== 'movie');

  readonly moviesPopular = this.#tmdbApiService.getPopularMovies(this.currentPage, this.#needsMovies, this.#sortBy);
  readonly seriesPopular = this.#tmdbApiService.getPopularSeries(this.currentPage, this.#needsSeries, this.#sortBy);

  readonly allPopular = computed(() => {
    const moviesResults = (this.moviesPopular.value()?.results ?? []).map(m => ({
      ...m,
      media_type: 'movie' as const
    }) as MovieMedia);
    const tvResults = (this.seriesPopular.value()?.results ?? []).map(m => ({
      ...m,
      media_type: 'tv' as const
    }) as SeriesMedia);
    const sort = this.#sortBy();
    return sortMerged([...moviesResults, ...tvResults], isCommonSort(sort) ? sort : DEFAULT_SORT);
  });

  readonly results = computed(() => {
    const type = this.mediaType();
    if (type === 'all') return this.allPopular();
    if (this.hasError()) return [];
    const response = type === 'movie' ? this.moviesPopular.value() : this.seriesPopular.value();
    if (!response) return [];
    return response.results.map(item => ({ ...item, media_type: this.mediaType() })) as Media[];
  });

  readonly totalResults = computed(() => {
    if (this.hasError() || this.isInitialLoading()) return 0;
    return pick(
      this.moviesPopular.value()?.total_results ?? 0,
      this.seriesPopular.value()?.total_results ?? 0,
      (this.moviesPopular.value()?.total_results ?? 0) + (this.seriesPopular.value()?.total_results ?? 0), this.mediaType()
    );
  });

  readonly hasError = computed(() => {
    return pick(!!this.moviesPopular.error(), !!this.seriesPopular.error(), !!(this.moviesPopular.error() || this.seriesPopular.error()), this.mediaType())
  });

  readonly isInitialLoading = computed(() => {
    return pick(this.moviesPopular.isLoading(), this.seriesPopular.isLoading(), this.moviesPopular.isLoading() || this.seriesPopular.isLoading(), this.mediaType());
  });

  onLoadMore(): void {
    this.isLoadingMore.set(true);
    this.loadMoreError.set(false);
    this.currentPage.update(p => p + 1);
  }

  onRetry(): void {
    const type = this.mediaType();
    if (type === 'all' || type === 'movie') this.moviesPopular.reload();
    if (type === 'all' || type === 'tv') this.seriesPopular.reload();
  }

  onResetFilter(): void {
    this.#userPreferencesService.resetAllCriteria();
  }

  constructor() {
    effect(() => {
      this.#filtersKey();
      this.sortMenu();
      this.titles.set([]);
      this.loadMoreError.set(false);
    });

    effect(() => {
      if (this.hasError()) {
        this.isLoadingMore.set(false);
        if (this.titles().length > 0) {
          this.loadMoreError.set(true);
        }
        return;
      }

      if (this.isInitialLoading()) return;

      this.loadMoreError.set(false);

      this.titles.update(titles => {
        const key = (m: Media) => `${m.media_type}-${m.id}`;
        const existingKeys = new Set(titles.map(key));
        const newItems = this.results().filter(item => !existingKeys.has(key(item)));
        return [...titles, ...newItems];
      });
      this.isLoadingMore.set(false);
    });
  }

}
