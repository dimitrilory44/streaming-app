import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting, TestRequest } from '@angular/common/http/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Genre } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';
import { Media, MediaType } from '@shared/types/collection.types';
import { StateMessage } from '@shared/components/state-message/state-message';
import { TitleFilterComponent } from '@features/titles/components/title-filter/title-filter';
import { TitleListComponent } from '@features/titles/components/title-list/title-list';
import { PopularTitlesComponent } from './popular-titles';

@Component({ selector: 'title-filter', template: '' })
class StubTitleFilter {
  readonly items = input<Media[]>([]);
  readonly countTitles = input(0);
  readonly isLoading = input(false);
  readonly currentMediaType = input<MediaType>('movie');
}

@Component({ selector: 'title-list', template: '' })
class StubTitleList {
  readonly items = input<Media[]>([]);
  readonly loading = input(false);
  readonly loadMore = output<void>();
}

@Component({ selector: 'state-message', template: '' })
class StubStateMessage {
  readonly title = input<string>();
  readonly illustration = input<string>();
  readonly hint = input<string>();
  readonly retryLabel = input<string>('Réessayer');
  readonly showRetry = input(true);
  readonly retry = output<void>();
}

const movie = (id: number, popularity = 100) => ({ id, title: `Film ${id}`, popularity, vote_average: 7, genre_ids: [] });
const serie = (id: number, popularity = 100) => ({ id, name: `Série ${id}`, popularity, vote_average: 7, genre_ids: [] });
const genre = (id: number): Genre => ({ id, name: `G${id}` });

describe('PopularTitlesComponent', () => {
  let fixture: ComponentFixture<PopularTitlesComponent>;
  let component: PopularTitlesComponent;
  let http: HttpTestingController;
  let prefs: UserPreferencesService;

  const discover = (mediaType: 'movie' | 'tv') =>
    http.match(req => req.url.includes(`/discover/${mediaType}`));

  const pageOf = (req: TestRequest) => new URL(req.request.urlWithParams, 'http://localhost').searchParams.get('page');

  const respond = (req: TestRequest, results: object[]) =>
    req.flush({ page: Number(pageOf(req)), results, total_results: results.length });

  async function create(mediaType: MediaType) {
    fixture = TestBed.createComponent(PopularTitlesComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('mediaType', mediaType);
    await settle();
  }

  /** `whenStable()` attendrait indéfiniment les requêtes HTTP en cours : on laisse simplement les effets s'exécuter. */
  async function settle() {
    TestBed.tick();
    await Promise.resolve();
    TestBed.tick();
  }

  beforeEach(async () => {
    localStorage.clear();
    await TestBed.configureTestingModule({
      imports: [PopularTitlesComponent],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    })
      .overrideComponent(PopularTitlesComponent, {
        remove: { imports: [TitleFilterComponent, TitleListComponent, StateMessage] },
        add: { imports: [StubTitleFilter, StubTitleList, StubStateMessage] },
      })
      .compileComponents();

    http = TestBed.inject(HttpTestingController);
    prefs = TestBed.inject(UserPreferencesService);
  });

  describe('requêtes envoyées selon le média', () => {
    it('films : n\'appelle pas /discover/tv', async () => {
      await create('movie');

      expect(discover('movie')).toHaveLength(1);
      expect(discover('tv')).toHaveLength(0);
    });

    it('séries : n\'appelle pas /discover/movie', async () => {
      await create('tv');

      expect(discover('tv')).toHaveLength(1);
      expect(discover('movie')).toHaveLength(0);
    });

    it('tous : appelle les deux', async () => {
      await create('all');

      expect(discover('movie')).toHaveLength(1);
      expect(discover('tv')).toHaveLength(1);
    });
  });

  describe('accumulation des titres', () => {
    it('affiche les résultats de la première page', async () => {
      await create('movie');

      respond(discover('movie')[0], [movie(1), movie(2)]);
      await settle();

      expect(component.titles().map(t => t.id)).toEqual([1, 2]);
    });

    it('ajoute la page suivante à la suite (« charger plus »)', async () => {
      await create('movie');
      respond(discover('movie')[0], [movie(1), movie(2)]);
      await settle();

      component.onLoadMore();
      await settle();
      const next = discover('movie');
      expect(pageOf(next[0])).toBe('2');
      respond(next[0], [movie(3)]);
      await settle();

      expect(component.titles().map(t => t.id)).toEqual([1, 2, 3]);
    });

    it('n\'ajoute pas deux fois le même titre', async () => {
      await create('movie');
      respond(discover('movie')[0], [movie(1), movie(2)]);
      await settle();

      component.onLoadMore();
      await settle();
      respond(discover('movie')[0], [movie(2), movie(3)]);
      await settle();

      expect(component.titles().map(t => t.id)).toEqual([1, 2, 3]);
    });

    it('mode « tous » : un film et une série de même id coexistent', async () => {
      await create('all');

      respond(discover('movie')[0], [movie(7, 90)]);
      respond(discover('tv')[0], [serie(7, 80)]);
      await settle();

      expect(component.titles().map(t => `${t.media_type}-${t.id}`).sort()).toEqual(['movie-7', 'tv-7']);
    });

    it('mode « tous » : une série de même id qu\'un film d\'une page précédente n\'est pas écartée', async () => {
      await create('all');
      respond(discover('movie')[0], [movie(7, 90)]);
      respond(discover('tv')[0], [serie(1, 80)]);
      await settle();

      component.onLoadMore();
      await settle();
      respond(discover('movie')[0], [movie(8, 70)]);
      respond(discover('tv')[0], [serie(7, 60)]);
      await settle();

      expect(component.titles().map(t => `${t.media_type}-${t.id}`).sort()).toEqual(['movie-7', 'movie-8', 'tv-1', 'tv-7']);
    });
  });

  describe('remise à zéro quand un filtre change', () => {
    async function onSecondPage() {
      await create('movie');
      respond(discover('movie')[0], [movie(1)]);
      await settle();
      component.onLoadMore();
      await settle();
      respond(discover('movie')[0], [movie(2)]);
      await settle();
      expect(component.currentPage()).toBe(2);
      expect(component.titles()).toHaveLength(2);
    }

    it.each([
      ['un genre inclus', () => prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)])],
      ['un genre exclu', () => prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [genre(27)])],
      ['la note', () => prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7)],
      ['le nombre de notes', () => prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 500)],
      ['l\'année', () => prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2010, max: 2020 })],
      ['la durée', () => prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 })],
      ['le pays', () => prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [{ id: 1, code: 'FR', name: 'France' }])],
      ['la classification films', () => prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [{ id: 1, certification: '12', meaning: '', order: 1 }])],
      ['les plateformes', () => prefs.setProviders([{ provider_id: 8, provider_name: 'N', logo_path: '' }])],
    ] as const)('revient à la page 1 et vide la liste quand on change %s', async (_label, change) => {
      await onSecondPage();

      change();
      await settle();

      expect(component.currentPage()).toBe(1);
      expect(component.titles()).toEqual([]);
      const next = discover('movie');
      expect(next.map(pageOf)).toEqual(['1']); // une seule requête, directement en page 1
    });

    it('revient à la page 1 quand le tri change', async () => {
      await onSecondPage();

      prefs.sortHelpers.movie.set('vote_average.desc');
      await settle();

      expect(component.currentPage()).toBe(1);
      expect(component.titles()).toEqual([]);
    });

    it('ne se remet pas à zéro quand les critères sont réécrits avec les mêmes valeurs', async () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, PREF.DEFAULT_NOTE);
      await onSecondPage();

      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, PREF.DEFAULT_NOTE); // nouvel objet, mêmes valeurs
      await settle();

      expect(component.currentPage()).toBe(2);
      expect(component.titles()).toHaveLength(2);
    });
  });

  describe('tri', () => {
    const sortOf = (req: TestRequest) => new URL(req.request.urlWithParams, 'http://localhost').searchParams.get('sort_by');

    it('mode « tous » : les deux requêtes suivent le tri « tous »', async () => {
      prefs.sortHelpers.all.set('vote_average.desc');
      prefs.sortHelpers.movie.set('revenue.desc');
      prefs.sortHelpers.tv.set('name.asc');

      await create('all');

      expect(sortOf(discover('movie')[0])).toBe('vote_average.desc');
      expect(sortOf(discover('tv')[0])).toBe('vote_average.desc');
    });

    it('mode « films » : suit le tri des films, pas celui de « tous »', async () => {
      prefs.sortHelpers.all.set('vote_average.desc');
      prefs.sortHelpers.movie.set('revenue.desc');

      await create('movie');

      expect(sortOf(discover('movie')[0])).toBe('revenue.desc');
    });

    it('mode « séries » : suit le tri des séries, pas celui de « tous »', async () => {
      prefs.sortHelpers.all.set('vote_average.desc');
      prefs.sortHelpers.tv.set('name.asc');

      await create('tv');

      expect(sortOf(discover('tv')[0])).toBe('name.asc');
    });

    it('mode « tous » : changer le tri relance les requêtes une seule fois, en page 1', async () => {
      await create('all');
      respond(discover('movie')[0], [movie(1)]);
      respond(discover('tv')[0], [serie(2)]);
      await settle();
      component.onLoadMore();
      await settle();
      respond(discover('movie')[0], [movie(3)]);
      respond(discover('tv')[0], [serie(4)]);
      await settle();
      expect(component.currentPage()).toBe(2);

      prefs.sortHelpers.all.set('vote_average.desc');
      await settle();

      const movies = discover('movie');
      const series = discover('tv');
      expect(movies.map(pageOf)).toEqual(['1']);
      expect(series.map(pageOf)).toEqual(['1']);
      expect([sortOf(movies[0]), sortOf(series[0])]).toEqual(['vote_average.desc', 'vote_average.desc']);
      expect(component.titles()).toEqual([]);
    });

    it('mode « tous » : « Mieux notés » impose le seuil de votes de chaque média', async () => {
      prefs.sortHelpers.all.set('vote_average.desc');

      await create('all');

      const params = (req: TestRequest) => new URL(req.request.urlWithParams, 'http://localhost').searchParams;
      expect(params(discover('movie')[0]).get('vote_count.gte')).toBe('300');
      expect(params(discover('tv')[0]).get('vote_count.gte')).toBe('100');
    });

    it('mode « tous » : « Mieux notés » classe par note pondérée, pas par note brute', async () => {
      prefs.sortHelpers.all.set('vote_average.desc');
      await create('all');

      respond(discover('movie')[0], [
        { ...movie(1), vote_average: 9.5, vote_count: 3 },      // note parfaite sur 3 votes
        { ...movie(2), vote_average: 8.4, vote_count: 20000 },  // très bonne note, très solide
      ]);
      respond(discover('tv')[0], [
        { ...serie(3), vote_average: 8.1, vote_count: 900 },
      ]);
      await settle();

      expect(component.titles().map(t => `${t.media_type}-${t.id}`)).toEqual(['movie-2', 'tv-3', 'movie-1']);
    });

    it('mode « tous » : « Popularité » ignore toujours le nombre de votes', async () => {
      await create('all');

      respond(discover('movie')[0], [{ ...movie(1, 10), vote_average: 9.9, vote_count: 5 }]);
      respond(discover('tv')[0], [{ ...serie(2, 80), vote_average: 5, vote_count: 5000 }]);
      await settle();

      expect(component.titles().map(t => `${t.media_type}-${t.id}`)).toEqual(['tv-2', 'movie-1']);
    });

    it('mode « tous » : un titre sans vote_count n\'est pas écarté ni ne fait planter le tri', async () => {
      prefs.sortHelpers.all.set('vote_average.desc');
      await create('all');

      respond(discover('movie')[0], [{ ...movie(1), vote_average: 8 }]);
      respond(discover('tv')[0], [{ ...serie(2), vote_average: 7, vote_count: 400 }]);
      await settle();

      expect(component.titles()).toHaveLength(2);
    });

    it('mode « tous » : une valeur de tri inconnue (ancien localStorage) retombe sur la popularité sans planter', async () => {
      prefs.sortHelpers.all.set('revenue.desc');
      await create('all');

      respond(discover('movie')[0], [{ ...movie(1), popularity: 10 }]);
      respond(discover('tv')[0], [{ ...serie(2), popularity: 50 }]);
      await settle();

      expect(component.titles().map(t => `${t.media_type}-${t.id}`)).toEqual(['tv-2', 'movie-1']);
    });
  });

  describe('suppression des filtres', () => {
    it('onResetFilter remet les critères à leur valeur par défaut', async () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 8);
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]);
      await create('movie');

      component.onResetFilter();

      expect(prefs.noteHelpers.isDefault()).toBe(true);
      expect(prefs.genreHelpers.hasItems()).toBe(false);
    });
  });
});