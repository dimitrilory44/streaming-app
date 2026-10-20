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
