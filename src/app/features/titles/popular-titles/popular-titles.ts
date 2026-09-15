import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { TitleFilterComponent } from '@features/titles/components/title-filter/title-filter';
import { TitleListComponent } from '@features/titles/components/title-list/title-list';
import { TmdbApiService } from '@core/services/tmdb-api';
import { MovieMedia, SeriesMedia } from '@core/models/media-model';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { StateMessage } from "@shared/components/state-message/state-message";
import { CommonSortOptions, Comparator, Media, MediaType } from '@shared/types/collection.types';
import { pick } from '@shared/helpers/collection.helpers';
import { UserPreferencesService } from '@core/services/user-preferences-service';

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
  readonly currentPage = signal(1);
  readonly isLoadingMore = signal(false);
  readonly loadMoreError = signal(false);

  readonly selectedProviderIds = this.#tmdbApiService.providersIds;
  readonly selectedGenresIds = this.#tmdbApiService.genresIds;
  readonly selectedBeginYear = computed(() => this.#tmdbApiService.filterYear().beginDate);
  readonly selectedEndYear = computed(() => this.#tmdbApiService.filterYear().endDate);

  readonly sortMenu = computed(() => this.#tmdbApiService.sortFilter(this.mediaType()));

  readonly moviesPopular = this.#tmdbApiService.getPopularMovies(this.currentPage);
  readonly seriesPopular = this.#tmdbApiService.getPopularSeries(this.currentPage);

  readonly allPopular = computed(() => {
    const comparators: Record<CommonSortOptions, Comparator<Media>> = {
      'popularity.desc': (a, b) => b.popularity - a.popularity,
      'vote_average.desc': (a, b) => b.vote_average - a.vote_average,
    };
    const moviesResults = (this.moviesPopular.value()?.results ?? []).map(m => ({
      ...m,
      media_type: 'movie' as const
    }) as MovieMedia);
    const tvResults = (this.seriesPopular.value()?.results ?? []).map(m => ({
      ...m,
      media_type: 'tv' as const
    }) as SeriesMedia);
    return [...moviesResults, ...tvResults].sort(comparators[this.sortMenu() as CommonSortOptions]);
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
    this.#userPreferencesService.setAllCriteria({});
  }

  constructor() {
    effect(() => {
      this.selectedGenresIds();
      this.selectedProviderIds();
      this.selectedBeginYear();
      this.selectedEndYear();
      this.sortMenu();
      this.titles.set([]);
      this.currentPage.set(1);
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
        const existingIds = new Set(titles.map(m => m.id));
        const newItems = this.results().filter(item => !existingIds.has(item.id));
        return [...titles, ...newItems];
      });
      this.isLoadingMore.set(false);
    });
  }

}
