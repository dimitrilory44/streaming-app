import { computed, effect, inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { Genre, GenreList, Providers, ProvidersApi, ProvidersState, TitleCollection, TitleDiscover } from '@core/models/media-model';
import { HttpClient, httpResource } from '@angular/common/http';
import { UserPreferencesService } from './user-preferences-service';
import { catchError, map, timeout } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { MediaType } from '@shared/types/collection.types';

@Injectable({
  providedIn: 'root',
})
export class TmdbApiService {
  readonly #http = inject(HttpClient);
  readonly #injector = inject(Injector);
  readonly #userPreferencesService = inject(UserPreferencesService);

  readonly #MOVIE_API_URL = environment.tmdbUrl;
  readonly mediaType = signal<MediaType>('movie');
  
  readonly providersIds = computed(() => this.#userPreferencesService.selectedProviders().map(sp => sp.provider_id).join('|'));
  readonly genresIds = computed(() => this.#userPreferencesService.genreHelpers.items().map(sg => sg.id).join('|'));

  readonly filterYear = computed(() => {
    const items = this.#userPreferencesService.releaseDateHelpers.items();
    const beginDate = items.startYear ? `${items.startYear}-01-01` : '1900-01-01';
    const endDate = items.endYear ? `${items.endYear}-12-31` : `${new Date().getFullYear()}-12-31`;
    return { beginDate, endDate }
  });
  
  readonly movieCollection = httpResource<TitleCollection>(() => `${this.#MOVIE_API_URL}/list/1`);
  
  readonly #moviesGender = httpResource<GenreList>(() => ({
    url: `${this.#MOVIE_API_URL}/genre/movie/list`,
    params: { language: 'fr-FR' } 
  }));
  
  readonly #seriesGender = httpResource<GenreList>(() => ({
    url: `${this.#MOVIE_API_URL}/genre/tv/list`,
    params: { language: 'fr-FR'}
  })); 
  
  readonly allGenders = computed<Genre[]>(() => {
    const movieGenderResults = this.#moviesGender.value()?.genres ?? [];
    const seriesGenderResults = this.#seriesGender.value()?.genres ?? [];
    
    return Array.from(
      new Map(
        [...movieGenderResults, ...seriesGenderResults].map
        (genre => [
          genre.id,
          genre
        ])
      ).values()
    );
  });

  sortFilter(mediaType: MediaType) {
    return this.#userPreferencesService.sortHelpers[mediaType].items();
  }
  
  getPopularMovies(page: Signal<number>) {
    return this.#getPopular('movie', page);
  }

  getPopularSeries(page: Signal<number>) {
    return this.#getPopular('tv', page);
  }

  getProvidersMovies() {
    return this.#getProviders('movie');
  }

  getProvidersSeries() {
    return this.#getProviders('tv');
  }

  #getPopular(mediaType: 'movie' | 'tv', page: Signal<number>) {
    return httpResource<TitleDiscover>(() => {
      const params: any = {
        language: 'fr-FR',
        watch_region: 'FR',
        page: page(),
        sort_by: this.sortFilter(mediaType),
        with_watch_providers: this.providersIds()
      };

      const isDateFilterActive = !this.#userPreferencesService.releaseDateHelpers.isDefault();
      const isGenderFilterActive = this.#userPreferencesService.genreHelpers.hasItems();

      if (isDateFilterActive) {
        const { beginDate, endDate } = this.filterYear();
        const gteKey = mediaType === 'movie' ? 'primary_release_date.gte' : 'first_air_date.gte';
        const lteKey = mediaType === 'movie' ? 'primary_release_date.lte' : 'first_air_date.lte';
        params[gteKey] = beginDate;
        params[lteKey] = endDate;
      }

      if (isGenderFilterActive) {
        const genders = this.genresIds();
        params['with_genres'] = genders;
      }

      return {
        url: `${this.#MOVIE_API_URL}/discover/${mediaType}`,
        params
      }
    });
  }

  // Problème rxResource v21
  // Contournement manuel afin de pouvoir ajouter une erreur lorsque les resources ne sont pas chargé (ou hors-ligne)
  #getProviders(mediaType: 'movie' | 'tv'): ProvidersState<Providers> {
    const value = signal<Providers | undefined>(undefined);
    const isLoading = signal(false);
    const error = signal<Error | undefined>(undefined);
    let subscription: Subscription | undefined;

    const fetch = () => {
      subscription?.unsubscribe();

      const url = `${this.#MOVIE_API_URL}/watch/providers/${mediaType}?language=fr-FR&watch_region=FR`;

      isLoading.set(true);
      error.set(undefined);

      subscription = this.#http
        .get<ProvidersApi>(url)
        .pipe(
          timeout(8000),
          map((response) => ({
            ...response,
            results: response.results.map(({ display_priority, display_priorities, ...rest }) => rest)
          })),
          catchError((err) => {
            error.set(err instanceof Error ? err : new Error('Impossible de charger les services de streaming', { cause: err }));
            return of(undefined);
          })
        )
        .subscribe((result) => {
          isLoading.set(false);
          if (result !== undefined) {
            value.set(result);
          }
        });
    };

    effect(() => {
      fetch();
    }, { injector: this.#injector });

    return {
      value: value.asReadonly(),
      isLoading: isLoading.asReadonly(),
      error: error.asReadonly(),
      reload: fetch,
    };
  }

}
