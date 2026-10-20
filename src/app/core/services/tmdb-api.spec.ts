import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Certification, Country, Genre, Provider } from '@core/models/media-model';
import { TmdbApiService } from '@core/services/tmdb-api';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';

const provider = (id: number): Provider => ({ provider_id: id, provider_name: `P${id}`, logo_path: '' });
const genre = (id: number): Genre => ({ id, name: `G${id}` });
const country = (code: string): Country => ({ id: PREF.COUNTRY_ID(code), code, name: code });
const certification = (value: string, order: number): Certification => ({ id: order, certification: value, meaning: value, order });

describe('TmdbApiService – paramètres de /discover', () => {
  let service: TmdbApiService;
  let prefs: UserPreferencesService;
  let http: HttpTestingController;
  const page = signal(1);

  /** Déclenche la ressource HTTP du média demandé et renvoie les paramètres de la requête /discover. */
  function discover(mediaType: 'movie' | 'tv'): URLSearchParams {
    TestBed.runInInjectionContext(() =>
      mediaType === 'movie' ? service.getPopularMovies(page) : service.getPopularSeries(page)
    );
    TestBed.tick();
    const requests: TestRequest[] = http.match(req => req.url.includes(`/discover/${mediaType}`));
    expect(requests).toHaveLength(1);
    return new URL(requests[0].request.urlWithParams, 'http://localhost').searchParams;
  }

  beforeEach(() => {
    localStorage.clear();
    page.set(1);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(TmdbApiService);
    prefs = TestBed.inject(UserPreferencesService);
    http = TestBed.inject(HttpTestingController);
  });

  describe('socle commun', () => {
    it('sans filtre, n\'envoie que les paramètres de base', () => {
      prefs.setProviders([provider(8)]);

      const params = discover('movie');

      expect(Object.fromEntries(params)).toEqual({
        language: 'fr-FR',
        watch_region: 'FR',
        page: '1',
        sort_by: PREF.DEFAULT_SORT,
        with_watch_providers: '8',
      });
    });

    it('joint les plateformes par « | »', () => {
      prefs.setProviders([provider(8), provider(337), provider(119)]);

      expect(discover('movie').get('with_watch_providers')).toBe('8|337|119');
    });

    it('envoie with_watch_providers même sans plateforme (comportement actuel à valider)', () => {
      prefs.setProviders([]);

      const params = discover('movie');

      expect(params.has('with_watch_providers')).toBe(true);
      expect(params.get('with_watch_providers')).toBe('');
    });

    it('reprend la page courante', () => {
      page.set(3);

      expect(discover('movie').get('page')).toBe('3');
    });

    it('utilise le tri propre à chaque média', () => {
      prefs.sortHelpers.movie.set('vote_average.desc');
      prefs.sortHelpers.tv.set('popularity.desc');

      expect(discover('movie').get('sort_by')).toBe('vote_average.desc');
    });
  });

  describe('année de sortie', () => {
    beforeEach(() => prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2010, max: 2020 }));

    it('film : utilise primary_release_date', () => {
      const params = discover('movie');

      expect(params.get('primary_release_date.gte')).toBe('2010-01-01');
      expect(params.get('primary_release_date.lte')).toBe('2020-12-31');
      expect(params.has('first_air_date.gte')).toBe(false);
    });

    it('série : utilise first_air_date', () => {
      const params = discover('tv');

      expect(params.get('first_air_date.gte')).toBe('2010-01-01');
      expect(params.get('first_air_date.lte')).toBe('2020-12-31');
      expect(params.has('primary_release_date.gte')).toBe(false);
    });

    it('n\'envoie rien quand la plage est celle par défaut', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, PREF.DEFAULT_RELEASE_DATE);

      const params = discover('movie');

      expect(params.has('primary_release_date.gte')).toBe(false);
      expect(params.has('primary_release_date.lte')).toBe(false);
    });
  });

  describe('genres', () => {
    it('inclut les genres (séparés par « | ») sans envoyer without_genres', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28), genre(35)]);

      const params = discover('movie');

      expect(params.get('with_genres')).toBe('28|35');
      expect(params.has('without_genres')).toBe(false);
    });

    it('exclut les genres sans envoyer with_genres', () => {
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [genre(27), genre(53)]);

      const params = discover('movie');

      expect(params.get('without_genres')).toBe('27|53');
      expect(params.has('with_genres')).toBe(false);
    });

    it('envoie les deux quand inclusion et exclusion coexistent', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]);
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [genre(27)]);

      const params = discover('movie');

      expect(params.get('with_genres')).toBe('28');
      expect(params.get('without_genres')).toBe('27');
    });
  });

  describe('notes', () => {
    it('envoie la note minimale', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);

      expect(discover('movie').get('vote_average.gte')).toBe('7');
    });

    it('n\'envoie pas la note quand elle vaut la valeur par défaut', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, PREF.DEFAULT_NOTE);

      expect(discover('movie').has('vote_average.gte')).toBe(false);
    });

    it('envoie le nombre minimal de votes', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 500);

      expect(discover('movie').get('vote_count.gte')).toBe('500');
    });
  });

  describe('pays', () => {
    it('joint les codes pays par « | »', () => {
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [country('FR'), country('US')]);

      expect(discover('movie').get('with_origin_country')).toBe('FR|US');
    });

    it('n\'envoie rien sans pays', () => {
      expect(discover('movie').has('with_origin_country')).toBe(false);
    });
  });

  describe('durée', () => {
    it('convertit les heures en minutes', () => {
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2.5 });

      const params = discover('movie');

      expect(params.get('with_runtime.gte')).toBe('60');
      expect(params.get('with_runtime.lte')).toBe('150');
    });

    it('arrondit les minutes', () => {
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 0.75, max: 1.5 });

      const params = discover('movie');

      expect(params.get('with_runtime.gte')).toBe('45');
      expect(params.get('with_runtime.lte')).toBe('90');
    });

    it('n\'envoie rien quand la plage est celle par défaut', () => {
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, PREF.DEFAULT_DURATION);

      expect(discover('movie').has('with_runtime.gte')).toBe(false);
    });
  });

  describe('classification par âge', () => {
    beforeEach(() => {
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [certification('12', 3), certification('16', 4)]);
      prefs.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [certification('10', 2)]);
    });

    it('film : utilise les classifications films', () => {
      const params = discover('movie');

      expect(params.get('certification_country')).toBe('FR');
      expect(params.get('certification')).toBe('12|16');
    });

    it('série : utilise les classifications séries', () => {
      const params = discover('tv');

      expect(params.get('certification_country')).toBe('FR');
      expect(params.get('certification')).toBe('10');
    });

    it('n\'envoie rien pour un média sans classification sélectionnée', () => {
      prefs.setCriteria(PREF.DEFAULT_TV_AGE_KEY, []);

      const params = discover('tv');

      expect(params.has('certification')).toBe(false);
      expect(params.has('certification_country')).toBe(false);
    });
  });

  describe('cumul', () => {
    it('combine tous les filtres actifs dans une seule requête', () => {
      prefs.setProviders([provider(8)]);
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2000, max: 2010 });
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]);
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 6);
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [country('FR')]);
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 });
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [certification('12', 3)]);

      expect(Object.fromEntries(discover('movie'))).toEqual({
        language: 'fr-FR',
        watch_region: 'FR',
        page: '1',
        sort_by: PREF.DEFAULT_SORT,
        with_watch_providers: '8',
        'primary_release_date.gte': '2000-01-01',
        'primary_release_date.lte': '2010-12-31',
        with_genres: '28',
        'vote_average.gte': '6',
        with_origin_country: 'FR',
        'with_runtime.gte': '60',
        'with_runtime.lte': '120',
        certification_country: 'FR',
        certification: '12',
      });
    });
  });
});
