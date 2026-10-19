import { Component, input, output, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Certification, Country, Genre } from '@core/models/media-model';
import { TmdbApiService } from '@core/services/tmdb-api';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';
import { CriteriaItem } from '@shared/types/collection.types';
import { TitleFilterCriteriaComponent } from './title-filter-criteria';
import { TitleFilterCriteriaGroupComponent } from './title-filter-criteria-group/title-filter-criteria-group';

/** Double du composant enfant : on teste ici le parent, pas le rendu des sliders / listes. */
@Component({ selector: 'filter-criteria-group', template: '' })
class StubCriteriaGroupComponent {
  /** Le contenu d'un mat-menu n'est instancié qu'à son ouverture : on garde une trace des instances créées. */
  static instances: StubCriteriaGroupComponent[] = [];

  readonly title = input.required<string>();
  readonly criteria = input.required<CriteriaItem[]>();
  readonly resetRequested = output<CriteriaItem['key']>();

  constructor() {
    StubCriteriaGroupComponent.instances.push(this);
  }
}

const GENRES: Genre[] = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comédie' },
];
const FRANCE: Country = { id: PREF.COUNTRY_ID('FR'), code: 'FR', name: 'France' };
const CERTIFS_MOVIE: Certification[] = [
  { id: 1, certification: 'U', meaning: 'Tous publics', order: 1 },
  { id: 2, certification: '12', meaning: 'Interdit aux moins de 12 ans', order: 2 },
];
const CERTIFS_TV: Certification[] = [
  { id: 1, certification: '10', meaning: 'Interdit aux moins de 10 ans', order: 1 },
  { id: 2, certification: '12', meaning: 'Interdit aux moins de 12 ans', order: 2 },
];

describe('TitleFilterCriteriaComponent', () => {
  let fixture: ComponentFixture<TitleFilterCriteriaComponent>;
  let component: TitleFilterCriteriaComponent;
  let prefs: UserPreferencesService;

  // Doubles pilotables du TmdbApiService (allGenders(), allCountries.value(), certificationsMovie() et certificationsSerie() sont utilisés).
  const genders = signal<Genre[]>(GENRES);
  const countries = signal<Country[] | undefined>([FRANCE]);
  const certificationsMovie = signal<Certification[]>(CERTIFS_MOVIE);
  const certificationsSerie = signal<Certification[]>(CERTIFS_TV);

  beforeEach(async () => {
    localStorage.clear();
    StubCriteriaGroupComponent.instances = [];
    genders.set(GENRES);
    countries.set([FRANCE]);

    await TestBed.configureTestingModule({
      imports: [TitleFilterCriteriaComponent],
      providers: [{ provide: TmdbApiService, useValue: { allGenders: genders, allCountries: { value: countries }, certificationsMovie, certificationsSerie } }],
    })
      .overrideComponent(TitleFilterCriteriaComponent, {
        remove: { imports: [TitleFilterCriteriaGroupComponent] },
        add: { imports: [StubCriteriaGroupComponent] },
      })
      .compileComponents();

    prefs = TestBed.inject(UserPreferencesService);
    fixture = TestBed.createComponent(TitleFilterCriteriaComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  const findGroup = (key: string) => component.criteriaList().find(c => c.key === key);

  describe('criteriaList', () => {
    it('construit un groupe par entrée de CRITERIA_LIST, dans le même ordre', () => {
      expect(component.criteriaList().map(c => c.key)).toEqual(PREF.CRITERIA_LIST.map(c => c.key));
    });

    it('utilise le libellé explicite quand il existe, sinon celui dérivé de la clé du premier critère', () => {
      expect(component.criteriaList().map(c => c.label)).toEqual([
        'Année de sortie',
        'Genres',
        'Note',
        'Pays de production',
        'Durée',
        'Age', // libellé explicite de CRITERIA_LIST
      ]);
    });

    it('expose tous les critères d\'un groupe multi-critères (Note + Nombre de notes)', () => {
      expect(findGroup(PREF.DEFAULT_NOTE_KEY)?.items.map(i => i.key)).toEqual([PREF.DEFAULT_NOTE_KEY, PREF.DEFAULT_NOTES_KEY]);
    });

    it('injecte les genres TMDB dans le critère "genders" uniquement', () => {
      const withValue = component.criteriaList().flatMap(c => c.items).filter(i => i.value !== undefined);
      const keys = withValue.map(i => i.key);

      expect(keys).toContain(PREF.DEFAULT_GENDERS_KEY);
      expect(withValue.find(i => i.key === PREF.DEFAULT_GENDERS_KEY)?.value).toEqual(GENRES);
    });

    it('injecte les pays TMDB dans le critère "country"', () => {
      expect(findGroup(PREF.DEFAULT_COUNTRY_KEY)?.items[0].value).toEqual([FRANCE]);
    });

    it('retombe sur une liste vide tant que les pays ne sont pas chargés', () => {
      countries.set(undefined);

      expect(findGroup(PREF.DEFAULT_COUNTRY_KEY)?.items[0].value).toEqual([]);
    });

    it('se recalcule quand les genres TMDB arrivent', () => {
      genders.set([]);
      expect(findGroup(PREF.DEFAULT_GENDERS_KEY)?.items[0].value).toEqual([]);

      genders.set([{ id: 18, name: 'Drame' }]);
      expect(findGroup(PREF.DEFAULT_GENDERS_KEY)?.items[0].value).toEqual([{ id: 18, name: 'Drame' }]);
    });

    it('ne mute pas la constante partagée CRITERIA_LIST', () => {
      component.criteriaList();

      const gendersItem = PREF.CRITERIA_LIST.find(c => c.key === PREF.DEFAULT_GENDERS_KEY)?.item[0];
      expect(gendersItem && 'value' in gendersItem).toBe(false);
    });
  });

  describe('isCriterionActive', () => {
    it('est faux pour tous les critères par défaut', () => {
      const keys = [
        PREF.DEFAULT_RELEASE_KEY,
        PREF.DEFAULT_NOTE_KEY,
        PREF.DEFAULT_GENDERS_KEY,
        PREF.DEFAULT_COUNTRY_KEY,
        PREF.DEFAULT_DURATION_KEY,
        PREF.DEFAULT_NOTES_KEY,
      ] as const;

      keys.forEach(key => expect(component.isCriterionActive(key), key).toBe(false));
    });

    it('release : actif seulement si la plage diffère de la plage par défaut', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2000, max: 2020 });
      expect(component.isCriterionActive(PREF.DEFAULT_RELEASE_KEY)).toBe(true);

      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { ...PREF.DEFAULT_RELEASE_DATE });
      expect(component.isCriterionActive(PREF.DEFAULT_RELEASE_KEY)).toBe(false);
    });

    it('note : actif dès que la note minimale est > 0', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      expect(component.isCriterionActive(PREF.DEFAULT_NOTE_KEY)).toBe(true);

      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 0);
      expect(component.isCriterionActive(PREF.DEFAULT_NOTE_KEY)).toBe(false);
    });

    it('genders : actif avec des genres inclus OU des genres exclus', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [GENRES[0]]);
      expect(component.isCriterionActive(PREF.DEFAULT_GENDERS_KEY)).toBe(true);

      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, []);
      expect(component.isCriterionActive(PREF.DEFAULT_GENDERS_KEY)).toBe(false);

      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [GENRES[1]]);
      expect(component.isCriterionActive(PREF.DEFAULT_GENDERS_KEY)).toBe(true);
    });

    it('country : actif avec au moins un pays sélectionné', () => {
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);
      expect(component.isCriterionActive(PREF.DEFAULT_COUNTRY_KEY)).toBe(true);

      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, []);
      expect(component.isCriterionActive(PREF.DEFAULT_COUNTRY_KEY)).toBe(false);
    });

    it('clés sans cas dédié (ex. duration) : actif dès qu\'une valeur est présente', () => {
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 });

      expect(component.isCriterionActive(PREF.DEFAULT_DURATION_KEY)).toBe(true);
    });
  });

  describe('reset', () => {
    it('release : remet la plage d\'années par défaut', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2000, max: 2010 });

      component.reset(PREF.DEFAULT_RELEASE_KEY);

      expect(prefs.releaseDateHelpers.isDefault()).toBe(true);
    });

    it('genders : vide à la fois les genres inclus et exclus', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [GENRES[0]]);
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [GENRES[1]]);

      component.reset(PREF.DEFAULT_GENDERS_KEY);

      expect(prefs.genreHelpers.count()).toBe(0);
      expect(prefs.genreExcludedHelpers.count()).toBe(0);
    });

    it('note : remet la note à 0 sans toucher au nombre de notes', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 8);
      prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 500);

      component.reset(PREF.DEFAULT_NOTE_KEY);

      expect(prefs.noteHelpers.isDefault()).toBe(true);
      expect(prefs.notesHelpers.items()).toBe(500);
    });

    it('country : vide la liste des pays', () => {
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);

      component.reset(PREF.DEFAULT_COUNTRY_KEY);

      expect(prefs.countryHelpers.count()).toBe(0);
    });

    it('un reset ciblé ne touche pas aux autres critères', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2000, max: 2010 });
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);

      component.reset(PREF.DEFAULT_COUNTRY_KEY);

      expect(prefs.releaseDateHelpers.items()).toEqual({ min: 2000, max: 2010 });
    });

    it('ne touche ni aux plateformes ni au tri', () => {
      prefs.setProviders([{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }]);
      prefs.sortHelpers.movie.set('vote_average.desc');

      component.reset(PREF.DEFAULT_RELEASE_KEY);

      expect(prefs.providerHelpers.count()).toBe(1);
      expect(prefs.sortHelpers.movie.items()).toBe('vote_average.desc');
    });

    it('duration : ne réinitialise que la durée', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2000, max: 2010 });
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 });

      component.reset(PREF.DEFAULT_DURATION_KEY);

      expect(prefs.durationHelpers.isDefault()).toBe(true);
      expect(prefs.releaseDateHelpers.items()).toEqual({ min: 2000, max: 2010 });
    });

    // ⚠️ Bug connu : pour la clé `notes` (sans `case` dans reset), `reset` appelle `setAllCriteria({})`
    // et efface TOUS les critères. `it.fails` passe tant que le bug existe et échouera une fois
    // corrigé (il suffira alors de remplacer `it.fails` par `it`).
    it.fails('notes : ne devrait réinitialiser que le nombre de notes', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 8);
      prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 500);

      component.reset(PREF.DEFAULT_NOTES_KEY);

      expect(prefs.notesHelpers.isDefault()).toBe(true);
      expect(prefs.noteHelpers.items()).toBe(8);
    });
  });

  describe('reset des âges', () => {
    const U = CERTIFS_MOVIE[0];
    const TEN = CERTIFS_TV[0];

    it.each([PREF.DEFAULT_MOVIES_AGE_KEY, PREF.DEFAULT_TV_AGE_KEY] as const)('reset(%s) vide les deux listes d\'âge', key => {
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [U]);
      prefs.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [TEN]);

      component.reset(key);

      expect(prefs.ageMoviesHelpers.items()).toEqual([]);
      expect(prefs.ageSeriesHelpers.items()).toEqual([]);
    });

    it('reset d\'un âge ne touche pas aux autres critères', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [U]);

      component.reset(PREF.DEFAULT_MOVIES_AGE_KEY);

      expect(prefs.noteHelpers.items()).toBe(7);
    });
  });

  describe('âges : listes et état actif', () => {
    it('injecte les certifications films et séries issues du service', () => {
      const items = component.criteriaList().flatMap(c => c.items);

      expect(items.find(i => i.key === PREF.DEFAULT_MOVIES_AGE_KEY)?.value).toEqual(CERTIFS_MOVIE);
      expect(items.find(i => i.key === PREF.DEFAULT_TV_AGE_KEY)?.value).toEqual(CERTIFS_TV);
    });

    it('chaque liste d\'âge est active indépendamment', () => {
      expect(component.isCriterionActive(PREF.DEFAULT_MOVIES_AGE_KEY)).toBe(false);
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [CERTIFS_MOVIE[0]]);

      expect(component.isCriterionActive(PREF.DEFAULT_MOVIES_AGE_KEY)).toBe(true);
      expect(component.isCriterionActive(PREF.DEFAULT_TV_AGE_KEY)).toBe(false);
    });

    it('la durée est active seulement si elle diffère de la valeur par défaut', () => {
      expect(component.isCriterionActive(PREF.DEFAULT_DURATION_KEY)).toBe(false);
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 });

      expect(component.isCriterionActive(PREF.DEFAULT_DURATION_KEY)).toBe(true);
    });
  });

  describe('resetAll', () => {
    it('efface tous les critères', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 2000, max: 2010 });
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [GENRES[0]]);
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);

      component.resetAll();

      expect(prefs.criteria()).toEqual({});
    });

    it('émet resetSortChange avec le tri par défaut', () => {
      const emitted = vi.fn();
      component.resetSortChange.subscribe(emitted);

      component.resetAll();

      expect(emitted).toHaveBeenCalledExactlyOnceWith(PREF.DEFAULT_SORT);
    });

    it('laisse la décision de réinitialiser le tri au parent (le tri du service n\'est pas modifié ici)', () => {
      prefs.sortHelpers.movie.set('vote_average.desc');

      component.resetAll();

      expect(prefs.sortHelpers.movie.items()).toBe('vote_average.desc');
    });

    it('conserve les plateformes sélectionnées', () => {
      prefs.setProviders([{ provider_id: 8, provider_name: 'Netflix', logo_path: '/n.png' }]);

      component.resetAll();

      expect(prefs.providerHelpers.count()).toBe(1);
    });
  });

  describe('état d\'ouverture des menus', () => {
    it('est fermé au départ', () => {
      expect(component.openMenuKey()).toBeNull();
    });

    it('onMenuOpened mémorise le menu ouvert', () => {
      component.onMenuOpened('genders');

      expect(component.openMenuKey()).toBe('genders');
    });

    it('onMenuClosed ferme le menu correspondant', () => {
      component.onMenuOpened('genders');

      component.onMenuClosed('genders');

      expect(component.openMenuKey()).toBeNull();
    });

    it('onMenuClosed d\'un autre menu n\'écrase pas le menu actuellement ouvert (changement de menu)', () => {
      component.onMenuOpened('genders');
      component.onMenuOpened('note');

      component.onMenuClosed('genders'); // l'ancien menu se ferme après l'ouverture du nouveau

      expect(component.openMenuKey()).toBe('note');
    });
  });

  describe('rendu', () => {
    const rows = () => Array.from<HTMLElement>(fixture.nativeElement.querySelectorAll('.filter-panel > .filter-items'));

    it('affiche une ligne par groupe avec son libellé', () => {
      const labels = rows().map(r => r.querySelector('span')?.textContent?.trim());

      expect(labels).toEqual(['Année de sortie', 'Genres', 'Note', 'Pays de production', 'Durée', 'Age']);
    });

    it('met en évidence le libellé d\'un groupe actif', () => {
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);
      fixture.detectChanges();

      const active = rows().filter(r => r.querySelector('span')?.classList.contains('is-active'));

      expect(active.map(r => r.querySelector('span')?.textContent?.trim())).toEqual(['Pays de production']);
    });

    it('un groupe multi-critères est actif si l\'un de ses critères l\'est (nombre de notes)', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 100);
      fixture.detectChanges();

      expect(findGroup(PREF.DEFAULT_NOTE_KEY)?.isActive).toBe(true);
    });

    it('crée un groupe enfant par critère de la liste', () => {
      expect(StubCriteriaGroupComponent.instances).toHaveLength(PREF.CRITERIA_LIST.length);
    });

    it('transmet titre et critères au groupe du critère', () => {
      const genres = StubCriteriaGroupComponent.instances[1];
      expect(genres.title()).toBe('Genres');
      expect(genres.criteria().map(c => c.key)).toEqual([PREF.DEFAULT_GENDERS_KEY]);
      expect(genres.criteria()[0].value).toEqual(GENRES);
    });

    it('relie l\'événement resetRequested du groupe à reset()', async () => {
      const resetSpy = vi.spyOn(component, 'reset');
      StubCriteriaGroupComponent.instances[3].resetRequested.emit(PREF.DEFAULT_COUNTRY_KEY);

      expect(resetSpy).toHaveBeenCalledExactlyOnceWith(PREF.DEFAULT_COUNTRY_KEY);
    });

    it('le bouton « Réinitialiser » appelle resetAll()', () => {
      const resetAllSpy = vi.spyOn(component, 'resetAll');

      fixture.nativeElement.querySelector('.criteria-panel__end .criteria-panel__reset').click();

      expect(resetAllSpy).toHaveBeenCalledTimes(1);
    });

    it('bascule l\'icône du déclencheur à l\'ouverture / fermeture réelle du menu', async () => {
      const loader = TestbedHarnessEnvironment.loader(fixture);
      const menus = await loader.getAllHarnesses(MatMenuHarness);
      const iconOf = (index: number) => rows()[index].querySelector('mat-icon')?.textContent?.trim();

      expect(menus).toHaveLength(PREF.CRITERIA_LIST.length);
      expect(iconOf(1)).toBe('expand_more');

      await menus[1].open();
      expect(component.openMenuKey()).toBe(PREF.DEFAULT_GENDERS_KEY);
      expect(iconOf(1)).toBe('expand_less');
      expect(iconOf(0)).toBe('expand_more');

      await menus[1].close();
      expect(component.openMenuKey()).toBeNull();
      expect(iconOf(1)).toBe('expand_more');
    });
  });
});
