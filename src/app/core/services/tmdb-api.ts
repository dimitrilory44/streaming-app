import { computed, effect, inject, Injectable, Injector, Signal, signal } from '@angular/core';
import { environment } from '@environments/environment';
import { CertificationList, Country, Genre, GenreList, Providers, ProvidersApi, ProvidersState, TitleCollection, TitleDiscover, TmdbCountry } from '@core/models/media-model';
import { HttpClient, httpResource } from '@angular/common/http';
import { UserPreferencesService } from './user-preferences-service';
import { catchError, map, timeout } from 'rxjs/operators';
import { of, Subscription } from 'rxjs';
import { MediaType } from '@shared/types/collection.types';
import { COUNTRY_ID } from '@shared/constants/filter-preferences';
import { toSignal } from '@angular/core/rxjs-interop';

@Injectable({
  providedIn: 'root',
})
export class TmdbApiService {
  readonly #http = inject(HttpClient);
  readonly #injector = inject(Injector);
  readonly #userPreferencesService = inject(UserPreferencesService);

  readonly #MOVIE_API_URL = environment.tmdbUrl;
  readonly mediaType = signal<MediaType>('movie');

  readonly providersIds = computed(() => this.#userPreferencesService.providerHelpers.items().map(sp => sp.provider_id).join('|'));
  readonly genresIds = computed(() => this.#userPreferencesService.genreHelpers.items().map(sg => sg.id).join('|'));
  readonly genresExcludedIds = computed(() => this.#userPreferencesService.genreExcludedHelpers.items().map(sg => sg.id).join('|'));

  readonly filterYear = computed(() => {
    const items = this.#userPreferencesService.releaseDateHelpers.items();
    const beginDate = items.min ? `${items.min}-01-01` : '1900-01-01';
    const endDate = items.max ? `${items.max}-12-31` : `${new Date().getFullYear()}-12-31`;
    return { beginDate, endDate };
  });

  readonly filterNote = computed(() => this.#userPreferencesService.noteHelpers.items());
  readonly filterNotes = computed(() => this.#userPreferencesService.notesHelpers.items());
  readonly filterCountry = computed(() => this.#userPreferencesService.countryHelpers.items().map(sg => sg.code).join('|'));
  readonly filterAgeMovie = computed(() => this.#userPreferencesService.ageMoviesHelpers.items().map(sg => sg.certification).join('|'));
  readonly filterAgeSerie = computed(() => this.#userPreferencesService.ageSeriesHelpers.items().map(sg => sg.certification).join('|'));

  readonly filterDuration = computed(() => {
    const items = this.#userPreferencesService.durationHelpers.items();
    const beginDuration = items.min ? Math.round(items.min * 60) : 0;
    const endDuration = items.max ? Math.round(items.max * 60) : 180;
    return { beginDuration, endDuration };
  });

  readonly certificationsMovie = toSignal(this.getCertificationAgeMovie(), { initialValue: [] });
  readonly certificationsSerie = toSignal(this.getCertificationAgeSerie(), { initialValue: [] });

  readonly movieCollection = httpResource<TitleCollection>(() => `${this.#MOVIE_API_URL}/list/1`);

  readonly #moviesGender = httpResource<GenreList>(() => ({
    url: `${this.#MOVIE_API_URL}/genre/movie/list`,
    params: { language: 'fr-FR' }
  }));

  readonly #seriesGender = httpResource<GenreList>(() => ({
    url: `${this.#MOVIE_API_URL}/genre/tv/list`,
    params: { language: 'fr-FR' }
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

  readonly allCountries = httpResource<Country[]>(() => ({
    url: `${this.#MOVIE_API_URL}/configuration/countries`,
    params: { language: 'fr-FR' },
  }),
    {
      defaultValue: [] as Country[],
      parse: (raw): Country[] => (raw as TmdbCountry[])
        .map(c => ({ id: COUNTRY_ID(c.iso_3166_1), code: c.iso_3166_1, name: c.native_name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
    }
  );

  getCertificationAgeMovie() {
    return this.#getCertification('movie');
  } 

  getCertificationAgeSerie() {
    return this.#getCertification('tv');
  }

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

  #getCertification(mediaType: 'movie' | 'tv') {
    return this.#http
      .get<CertificationList>(`${this.#MOVIE_API_URL}/certification/${mediaType}/list`)
      .pipe(
        map(res => res.certifications['FR'] ?? []),
        map(certifications =>
          certifications.map((certification, index) => ({
            ...certification,
            id: index + 1
          }))
        )
      );
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
      const isGenderExcludedFilterActive = this.#userPreferencesService.genreExcludedHelpers.hasItems();
      const isNoteFilterActive = !this.#userPreferencesService.noteHelpers.isDefault();
      const isNotesCountFilterActive = !this.#userPreferencesService.notesHelpers.isDefault();
      const isCountryFilterActive = this.#userPreferencesService.countryHelpers.hasItems();
      const isDurationFilterActive = !this.#userPreferencesService.durationHelpers.isDefault();
      const ageCertification = mediaType === 'movie' ? this.filterAgeMovie() : this.filterAgeSerie();

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

      if (isGenderExcludedFilterActive) {
        const excludedGenders = this.genresExcludedIds();
        params['without_genres'] = excludedGenders;
      }

      if (isNoteFilterActive) {
        const note = this.filterNote();
        params['vote_average.gte'] = note;
      }

      if (isNotesCountFilterActive) {
        const notes = this.filterNotes();
        params['vote_count.gte'] = notes;
      }

      if (isCountryFilterActive) {
        const countries = this.filterCountry();
        params['with_origin_country'] = countries;
      }

      if (isDurationFilterActive) {
        const { beginDuration, endDuration } = this.filterDuration();
        params['with_runtime.gte'] = beginDuration;
        params['with_runtime.lte'] = endDuration;
      }

      if (ageCertification) {
        params['certification_country'] = 'FR';
        params['certification'] = ageCertification;
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
