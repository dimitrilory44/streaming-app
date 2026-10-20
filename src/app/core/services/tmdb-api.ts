import { computed, inject, Injectable, Signal, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { CertificationList, Country, Genre, GenreList, Providers, ProvidersApi, ProvidersState, TitleDiscover, TmdbCountry } from '@core/models/media-model';
import { HttpClient, httpResource } from '@angular/common/http';
import { UserPreferencesService } from './user-preferences-service';
import { catchError, map, timeout } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { MediaType } from '@shared/types/collection.types';
import { CERTIFICATIONS_TIMEOUT_MS, COUNTRY_ID, DEFAULT_COUNTRY_KEY, DEFAULT_DURATION, DEFAULT_DURATION_KEY, DEFAULT_NOTE_KEY, DEFAULT_NOTES_KEY, DEFAULT_RELEASE_DATE, DEFAULT_RELEASE_KEY, LANGUAGE, PROVIDERS_TIMEOUT_MS, REGION } from '@shared/constants/filter-preferences';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class TmdbApiService {
  readonly #http = inject(HttpClient);
  readonly #userPreferencesService = inject(UserPreferencesService);

  readonly #MOVIE_API_URL = environment.tmdbUrl;

  readonly providersIds = computed(() => this.#userPreferencesService.providerHelpers.items().map(provider => provider.provider_id).join('|'));
  readonly genresIds = computed(() => this.#userPreferencesService.genreHelpers.items().map(genre => genre.id).join('|'));
  readonly #genresExcludedIds = computed(() => this.#userPreferencesService.genreExcludedHelpers.items().map(genre => genre.id).join('|'));

  readonly filterYear = computed(() => {
    const items = this.#userPreferencesService.releaseDateHelpers.items();
    const beginDate = items.min ? `${items.min}-01-01` : `${DEFAULT_RELEASE_DATE.min}-01-01`;
    const endDate = items.max ? `${items.max}-12-31` : `${new Date().getFullYear()}-12-31`;
    return { beginDate, endDate };
  });

  readonly filterNote = computed(() => this.#userPreferencesService.noteHelpers.items());
  readonly filterNotes = computed(() => this.#userPreferencesService.notesHelpers.items());
  readonly filterCountry = computed(() => this.#userPreferencesService.countryHelpers.items().map(country => country.code).join('|'));
  readonly filterAgeMovie = computed(() => this.#userPreferencesService.ageMoviesHelpers.items().map(certification => certification.certification).join('|'));
  readonly filterAgeSerie = computed(() => this.#userPreferencesService.ageSeriesHelpers.items().map(certification => certification.certification).join('|'));

  readonly filterDuration = computed(() => {
    const items = this.#userPreferencesService.durationHelpers.items();
    const beginDuration = items.min ? Math.round(items.min * 60) : 0;
    const endDuration = items.max ? Math.round(items.max * 60) : Math.round(DEFAULT_DURATION.max * 60);
    return { beginDuration, endDuration };
  });

  readonly certificationsMovie = toSignal(this.#getCertification('movie'), { initialValue: [] });
  readonly certificationsSerie = toSignal(this.#getCertification('tv'), { initialValue: [] });

  readonly #moviesGender = httpResource<GenreList>(() => ({
    url: `${this.#MOVIE_API_URL}/genre/movie/list`,
    params: { language: LANGUAGE }
  }));

  readonly #seriesGender = httpResource<GenreList>(() => ({
    url: `${this.#MOVIE_API_URL}/genre/tv/list`,
    params: { language: LANGUAGE }
  }));

  readonly allGenders = computed<Genre[]>(() => {
    const movieGenderResults = this.#moviesGender.value()?.genres ?? [];
    const seriesGenderResults = this.#seriesGender.value()?.genres ?? [];

    const all = [...movieGenderResults, ...seriesGenderResults];
    return Array.from(new Map(all.map(genre => [genre.id, genre])).values());
  });

  readonly allCountries = httpResource<Country[]>(() => ({
    url: `${this.#MOVIE_API_URL}/configuration/countries`,
    params: { language: LANGUAGE },
  }),
    {
      defaultValue: [] as Country[],
      parse: (raw): Country[] => (raw as TmdbCountry[])
        .map(c => ({ id: COUNTRY_ID(c.iso_3166_1), code: c.iso_3166_1, name: c.native_name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    }
  );

  sortFilter(mediaType: MediaType) {
    return this.#userPreferencesService.sortHelpers[mediaType].items();
  }

  getPopularMovies(page: Signal<number>, enabled: Signal<boolean> = signal(true)) {
    return this.#getPopular('movie', page, enabled);
  }
  getPopularSeries(page: Signal<number>, enabled: Signal<boolean> = signal(true)) {
    return this.#getPopular('tv', page, enabled);
  }

  getProvidersMovies() {
    return this.#getProviders('movie');
  }

  getProvidersSeries() {
    return this.#getProviders('tv');
  }

  #getCertification(mediaType: 'movie' | 'tv') {
    return this.#http
      .get<CertificationList>(`${this.#MOVIE_API_URL}/certification/${mediaType}/list`)
      .pipe(
        timeout(CERTIFICATIONS_TIMEOUT_MS),
        map(res => res.certifications[REGION] ?? []),
        map(certifications =>
          certifications.map((certification, index) => ({
            ...certification,
            id: index + 1
          }))
        ),
        catchError(() => of([]))
      );
  }

  #getPopular(mediaType: 'movie' | 'tv', page: Signal<number>, enabled: Signal<boolean>) {
  return httpResource<TitleDiscover>(() => {
    if (!enabled()) return undefined; 
    return {
      url: `${this.#MOVIE_API_URL}/discover/${mediaType}`,
      params: this.#buildDiscoverParams(mediaType, page()),
    };
  });
}

  #buildDiscoverParams(mediaType: 'movie' | 'tv', page: number): Record<string, string | number> {
    const prefs = this.#userPreferencesService;
    const isMovie = mediaType === 'movie';

    const params: Record<string, string | number> = {
      language: LANGUAGE,
      watch_region: REGION,
      page,
      sort_by: this.sortFilter(mediaType),
      with_watch_providers: this.providersIds(),
    };

    if (prefs.isCriterionActive(DEFAULT_RELEASE_KEY)) {
      const { beginDate, endDate } = this.filterYear();
      params[isMovie ? 'primary_release_date.gte' : 'first_air_date.gte'] = beginDate;
      params[isMovie ? 'primary_release_date.lte' : 'first_air_date.lte'] = endDate;
    }

    if (prefs.genreHelpers.hasItems()) params['with_genres'] = this.genresIds();
    if (prefs.genreExcludedHelpers.hasItems()) params['without_genres'] = this.#genresExcludedIds();
    if (prefs.isCriterionActive(DEFAULT_NOTE_KEY)) params['vote_average.gte'] = this.filterNote();
    if (prefs.isCriterionActive(DEFAULT_NOTES_KEY)) params['vote_count.gte'] = this.filterNotes();
    if (prefs.isCriterionActive(DEFAULT_COUNTRY_KEY)) params['with_origin_country'] = this.filterCountry();

    if (prefs.isCriterionActive(DEFAULT_DURATION_KEY)) {
      const { beginDuration, endDuration } = this.filterDuration();
      params['with_runtime.gte'] = beginDuration;
      params['with_runtime.lte'] = endDuration;
    }

    const ageCertification = isMovie ? this.filterAgeMovie() : this.filterAgeSerie();
    if (ageCertification) {
      params['certification_country'] = REGION;
      params['certification'] = ageCertification;
    }

    return params;
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

      const url = `${this.#MOVIE_API_URL}/watch/providers/${mediaType}?language=${LANGUAGE}&watch_region=${REGION}`;

      isLoading.set(true);
      error.set(undefined);

      subscription = this.#http
        .get<ProvidersApi>(url)
        .pipe(
          timeout(PROVIDERS_TIMEOUT_MS),
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

    fetch();

    return {
      value: value.asReadonly(),
      isLoading: isLoading.asReadonly(),
      error: error.asReadonly(),
      reload: fetch,
    };
  }

}
