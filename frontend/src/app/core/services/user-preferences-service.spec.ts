import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Certification, Criteria, Genre, Provider, UserPreferences } from '@core/models/media-model';
import * as PREF from '@shared/constants/filter-preferences';
import { UserPreferencesService } from './user-preferences-service';

const genre = (id: number, name = `Genre ${id}`): Genre => ({ id, name });
const provider = (id: number): Provider => ({ provider_id: id, provider_name: `Provider ${id}`, logo_path: `/p${id}.png` });
const certif = (certification: string, order: number): Certification => ({ id: order, certification, meaning: certification, order });
const FRANCE = { id: PREF.COUNTRY_ID('FR'), code: 'FR', name: 'France' };

/** Contrat attendu pour la notion de critère « actif » (voir le bloc dédié en fin de fichier). */
interface ActiveCriteriaApi {
  isCriterionActive(key: keyof Criteria): boolean;
  activeCriteriaCount(): number;
}

/** Contrat attendu pour la réinitialisation des critères (voir le bloc dédié en fin de fichier). */
interface ResetApi {
  resetCriterion(key: keyof Criteria): void;
  resetAllCriteria(): void;
}

const stored = () => JSON.parse(localStorage.getItem(PREF.DEFAULT_STORAGE_KEY) ?? 'null') as UserPreferences | null;

describe('UserPreferencesService', () => {
  let service: UserPreferencesService;

  /** Le service est un singleton racine : on l'instancie après avoir préparé le localStorage. */
  const create = () => (service = TestBed.inject(UserPreferencesService));

  beforeEach(() => localStorage.clear());
  afterEach(() => vi.restoreAllMocks());

  describe('chargement initial', () => {
    it('part des valeurs par défaut quand rien n\'est stocké', () => {
      create();

      expect(service.data()).toEqual(PREF.DEFAULT_SORT_MEDIA);
      expect(service.criteria()).toBeUndefined();
      expect(service.providerHelpers.items()).toEqual([]);
    });

    it('relit les préférences stockées', () => {
      localStorage.setItem(PREF.DEFAULT_STORAGE_KEY, JSON.stringify({
        providers: [provider(8)],
        criteria: { note: 7, genders: [genre(28)] },
        sort: { movie: 'title.asc', tv: 'name.asc', all: 'vote_average.desc' },
      }));
      create();

      expect(service.providerHelpers.items()).toEqual([provider(8)]);
      expect(service.noteHelpers.items()).toBe(7);
      expect(service.genreHelpers.items()).toEqual([genre(28)]);
      expect(service.sortHelpers.movie.items()).toBe('title.asc');
      expect(service.sortHelpers.tv.items()).toBe('name.asc');
      expect(service.sortHelpers.all.items()).toBe('vote_average.desc');
    });

    it('complète avec les valeurs par défaut quand le stockage est partiel', () => {
      localStorage.setItem(PREF.DEFAULT_STORAGE_KEY, JSON.stringify({ criteria: { note: 5 } }));
      create();

      expect(service.noteHelpers.items()).toBe(5);
      expect(service.sortHelpers.movie.items()).toBe(PREF.DEFAULT_SORT);
    });

    it('repart des valeurs par défaut et nettoie le stockage quand le JSON est corrompu', () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      localStorage.setItem(PREF.DEFAULT_STORAGE_KEY, '{ pas du json');
      create();

      expect(service.data()).toEqual(PREF.DEFAULT_SORT_MEDIA);
      expect(error).toHaveBeenCalledOnce();
      expect(localStorage.getItem(PREF.DEFAULT_STORAGE_KEY)).toBeNull();
    });
  });

  describe('écriture', () => {
    beforeEach(create);

    it('setCriteria modifie une clé sans toucher aux autres', () => {
      service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      service.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);

      expect(service.criteria()).toEqual({ note: 7, country: [FRANCE] });
    });

    it('setCriteria remplace la valeur précédente de la clé', () => {
      service.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]);
      service.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(35)]);

      expect(service.genreHelpers.items()).toEqual([genre(35)]);
    });

    it('setAllCriteria remplace tous les critères', () => {
      service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);

      service.setAllCriteria({ notes: 100 });

      expect(service.criteria()).toEqual({ notes: 100 });
    });

    it('setAllCriteria({}) réinitialise tous les critères mais conserve le tri et les plateformes', () => {
      service.setProviders([provider(8)]);
      service.sortHelpers.movie.set('title.asc');
      service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);

      service.setAllCriteria({});

      expect(service.criteria()).toEqual({});
      expect(service.providerHelpers.items()).toEqual([provider(8)]);
      expect(service.sortHelpers.movie.items()).toBe('title.asc');
    });

    it('setProviders remplace la liste des plateformes', () => {
      service.setProviders([provider(8), provider(337)]);
      service.setProviders([provider(1)]);

      expect(service.providerHelpers.items()).toEqual([provider(1)]);
    });
  });

  describe('persistance', () => {
    beforeEach(create);

    it('enregistre les préférences dans le localStorage après un changement', () => {
      service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      service.setProviders([provider(8)]);
      TestBed.tick();

      expect(stored()).toEqual(service.data());
      expect(stored()?.criteria).toEqual({ note: 7 });
      expect(stored()?.providers).toEqual([provider(8)]);
    });

    it('enregistre aussi le tri', () => {
      service.sortHelpers.tv.set('name.asc');
      TestBed.tick();

      expect(stored()?.sort.tv).toBe('name.asc');
    });

    it('une nouvelle instance relit ce qui a été enregistré', () => {
      service.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);
      TestBed.tick();

      TestBed.resetTestingModule();
      const fresh = TestBed.inject(UserPreferencesService);

      expect(fresh.countryHelpers.items()).toEqual([FRANCE]);
    });
  });

  describe('helpers de sélection', () => {
    beforeEach(create);

    it('items, count et hasItems suivent la valeur de la clé', () => {
      expect(service.countryHelpers.items()).toEqual([]);
      expect(service.countryHelpers.count()).toBe(0);
      expect(service.countryHelpers.hasItems()).toBe(false);

      service.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);

      expect(service.countryHelpers.count()).toBe(1);
      expect(service.countryHelpers.hasItems()).toBe(true);
    });

    it('genres inclus et exclus sont indépendants', () => {
      service.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]);

      expect(service.genreHelpers.hasItems()).toBe(true);
      expect(service.genreExcludedHelpers.hasItems()).toBe(false);
    });

    it('les âges films et séries sont indépendants', () => {
      service.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [certif('12', 2)]);

      expect(service.ageMoviesHelpers.items()).toEqual([certif('12', 2)]);
      expect(service.ageSeriesHelpers.items()).toEqual([]);
    });

    it('les plateformes sont lues dans `providers`, pas dans les critères', () => {
      service.setProviders([provider(8)]);

      expect(service.providerHelpers.count()).toBe(1);
      expect(service.criteria()).toBeUndefined();
    });
  });

  describe('helpers de plage', () => {
    beforeEach(create);

    it('la date de sortie est « par défaut » tant qu\'elle n\'a pas changé', () => {
      expect(service.releaseDateHelpers.isDefault()).toBe(true);
      expect(service.releaseDateHelpers.items()).toEqual(PREF.DEFAULT_RELEASE_DATE);

      service.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 1990, max: 2000 });

      expect(service.releaseDateHelpers.isDefault()).toBe(false);
      expect(service.releaseDateHelpers.items()).toEqual({ min: 1990, max: 2000 });
    });

    it('une plage égale à la valeur par défaut redevient « par défaut »', () => {
      service.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 1990, max: 2000 });
      service.setCriteria(PREF.DEFAULT_RELEASE_KEY, { ...PREF.DEFAULT_RELEASE_DATE });

      expect(service.releaseDateHelpers.isDefault()).toBe(true);
    });

    it('la durée suit le même principe', () => {
      expect(service.durationHelpers.isDefault()).toBe(true);

      service.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 });

      expect(service.durationHelpers.isDefault()).toBe(false);
      expect(service.durationHelpers.items()).toEqual({ min: 1, max: 2 });
    });

    it.each([
      ['note', PREF.DEFAULT_NOTE_KEY, (s: UserPreferencesService) => s.noteHelpers],
      ['nombre de notes', PREF.DEFAULT_NOTES_KEY, (s: UserPreferencesService) => s.notesHelpers],
    ] as const)('%s : 0 par défaut puis modifiée', (_label, key, helpers) => {
      expect(helpers(service).items()).toBe(0);
      expect(helpers(service).isDefault()).toBe(true);

      service.setCriteria(key, 6);

      expect(helpers(service).items()).toBe(6);
      expect(helpers(service).isDefault()).toBe(false);
    });
  });

  describe('tri', () => {
    beforeEach(create);

    it('chaque média a son propre tri, « popularité » par défaut', () => {
      (['movie', 'tv', 'all'] as const).forEach(media => {
        expect(service.sortHelpers[media].items()).toBe(PREF.DEFAULT_SORT);
        expect(service.sortHelpers[media].isDefault()).toBe(true);
      });
    });

    it('modifier le tri d\'un média ne touche pas aux deux autres', () => {
      service.sortHelpers.movie.set('revenue.desc');

      expect(service.sortHelpers.movie.items()).toBe('revenue.desc');
      expect(service.sortHelpers.movie.isDefault()).toBe(false);
      expect(service.sortHelpers.tv.items()).toBe(PREF.DEFAULT_SORT);
      expect(service.sortHelpers.all.items()).toBe(PREF.DEFAULT_SORT);
    });

    it('modifier le tri ne touche ni aux critères ni aux plateformes', () => {
      service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      service.setProviders([provider(8)]);

      service.sortHelpers.tv.set('name.asc');

      expect(service.noteHelpers.items()).toBe(7);
      expect(service.providerHelpers.items()).toEqual([provider(8)]);
    });

    it('revenir au tri par défaut le redonne comme « par défaut »', () => {
      service.sortHelpers.movie.set('title.asc');
      service.sortHelpers.movie.set(PREF.DEFAULT_SORT);

      expect(service.sortHelpers.movie.isDefault()).toBe(true);
    });
  });

  /**
   * Critères « actifs » : ces tests décrivent l'API prévue dans `UserPreferencesService`
   * (`isCriterionActive(key)` et `activeCriteriaCount`). Ils sont ignorés tant que la méthode
   * n'existe pas sur le service, et s'activent d'eux-mêmes dès qu'elle est ajoutée.
   * `activeCriteriaCount` est un `computed` (signal) : on l'appelle comme une fonction.
   */
  describe('critères actifs', () => {
    const api = () => service as unknown as ActiveCriteriaApi;
    beforeEach(create);

    it('aucun critère n\'est actif par défaut', () => {
      const keys: (keyof Criteria)[] = [
        PREF.DEFAULT_RELEASE_KEY, PREF.DEFAULT_GENDERS_KEY, PREF.DEFAULT_NOTE_KEY, PREF.DEFAULT_NOTES_KEY,
        PREF.DEFAULT_COUNTRY_KEY, PREF.DEFAULT_DURATION_KEY, PREF.DEFAULT_MOVIES_AGE_KEY, PREF.DEFAULT_TV_AGE_KEY,
      ];

      keys.forEach(key => expect(api().isCriterionActive(key), key).toBe(false));
      expect(api().activeCriteriaCount()).toBe(0);
    });

    describe.each<[string, keyof Criteria, () => void, () => void]>([
      ['release', PREF.DEFAULT_RELEASE_KEY,
        () => service.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 1990, max: 2000 }),
        () => service.setCriteria(PREF.DEFAULT_RELEASE_KEY, { ...PREF.DEFAULT_RELEASE_DATE })],
      ['note', PREF.DEFAULT_NOTE_KEY,
        () => service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7),
        () => service.setCriteria(PREF.DEFAULT_NOTE_KEY, 0)],
      ['notes', PREF.DEFAULT_NOTES_KEY,
        () => service.setCriteria(PREF.DEFAULT_NOTES_KEY, 200),
        () => service.setCriteria(PREF.DEFAULT_NOTES_KEY, 0)],
      ['genders', PREF.DEFAULT_GENDERS_KEY,
        () => service.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]),
        () => service.setCriteria(PREF.DEFAULT_GENDERS_KEY, [])],
      ['country', PREF.DEFAULT_COUNTRY_KEY,
        () => service.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]),
        () => service.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [])],
      ['duration', PREF.DEFAULT_DURATION_KEY,
        () => service.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 }),
        () => service.setCriteria(PREF.DEFAULT_DURATION_KEY, { ...PREF.DEFAULT_DURATION })],
      ['moviesAge', PREF.DEFAULT_MOVIES_AGE_KEY,
        () => service.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [certif('12', 2)]),
        () => service.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [])],
      ['seriesAge', PREF.DEFAULT_TV_AGE_KEY,
        () => service.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [certif('10', 1)]),
        () => service.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [])],
    ])('%s', (_label, key, activate, deactivate) => {
      it('devient actif quand sa valeur change', () => {
        activate();

        expect(api().isCriterionActive(key)).toBe(true);
      });

      it('redevient inactif quand on revient à la valeur par défaut', () => {
        activate();
        deactivate();

        expect(api().isCriterionActive(key)).toBe(false);
      });
    });

    it('les genres sont actifs dès que des genres sont exclus, même sans genre inclus', () => {
      service.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [genre(35)]);

      expect(api().isCriterionActive(PREF.DEFAULT_GENDERS_KEY)).toBe(true);
    });

    it('les âges films et séries sont actifs indépendamment', () => {
      service.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [certif('12', 2)]);

      expect(api().isCriterionActive(PREF.DEFAULT_MOVIES_AGE_KEY)).toBe(true);
      expect(api().isCriterionActive(PREF.DEFAULT_TV_AGE_KEY)).toBe(false);
    });

    describe('activeCriteriaCount (un par menu de CRITERIA_LIST)', () => {
      it('compte chaque menu actif une fois', () => {
        service.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 1990, max: 2000 });
        service.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [FRANCE]);

        expect(api().activeCriteriaCount()).toBe(2);
      });

      it('genres inclus et exclus ne forment qu\'un seul menu', () => {
        service.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre(28)]);
        service.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [genre(35)]);

        expect(api().activeCriteriaCount()).toBe(1);
      });

      it('note et nombre de notes ne forment qu\'un seul menu', () => {
        service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
        service.setCriteria(PREF.DEFAULT_NOTES_KEY, 200);

        expect(api().activeCriteriaCount()).toBe(1);
      });

      it('le nombre de notes seul suffit à activer le menu Note', () => {
        service.setCriteria(PREF.DEFAULT_NOTES_KEY, 200);

        expect(api().activeCriteriaCount()).toBe(1);
      });

      it('âge films et âge séries ne forment qu\'un seul menu', () => {
        service.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [certif('12', 2)]);
        service.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [certif('12', 2)]);

        expect(api().activeCriteriaCount()).toBe(1);
      });

      it('le maximum est le nombre de menus', () => {
        service.setAllCriteria({
          release: { min: 1990, max: 2000 },
          genders: [genre(28)],
          note: 7,
          notes: 200,
          country: [FRANCE],
          duration: { min: 1, max: 2 },
          moviesAge: [certif('12', 2)],
          seriesAge: [certif('10', 1)],
        });

        expect(api().activeCriteriaCount()).toBe(PREF.CRITERIA_LIST.length);
      });

      it('le tri et les plateformes ne comptent pas', () => {
        service.sortHelpers.movie.set('title.asc');
        service.setProviders([provider(8)]);

        expect(api().activeCriteriaCount()).toBe(0);
      });

      it('revient à 0 après une réinitialisation', () => {
        service.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
        service.setAllCriteria({});

        expect(api().activeCriteriaCount()).toBe(0);
      });
    });
  });

  /**
   * Réinitialisation des critères dans le service (à écrire : `resetCriterion(key)` et `resetAllCriteria()`).
   * Ce bloc est ignoré tant que `resetCriterion` n'existe pas comme MÉTHODE DE CLASSE du service
   * (un champ fléché n'est pas sur le prototype : le bloc resterait ignoré), et s'active tout seul ensuite.
   */
  describe('réinitialisation des critères', () => {
    const api = () => service as unknown as ResetApi;
    beforeEach(create);

    const populated = (): Criteria => ({
      genders: [genre(28)],
      excludedGenders: [genre(35)],
      release: { min: 1990, max: 2000 },
      note: 7,
      notes: 200,
      country: [FRANCE],
      duration: { min: 1, max: 2 },
      moviesAge: [certif('12', 2)],
      seriesAge: [certif('12', 2)],
    });

    /** Pour chaque menu : la clé demandée et ce que le reset doit remettre à sa valeur par défaut. */
    const CASES: [keyof Criteria, Criteria][] = [
      [PREF.DEFAULT_RELEASE_KEY, { release: PREF.DEFAULT_RELEASE_DATE }],
      [PREF.DEFAULT_GENDERS_KEY, { genders: [], excludedGenders: [] }],
      [PREF.DEFAULT_NOTE_KEY, { note: PREF.DEFAULT_NOTE }],
      [PREF.DEFAULT_NOTES_KEY, { notes: 0 }],
      [PREF.DEFAULT_COUNTRY_KEY, { country: [] }],
      [PREF.DEFAULT_DURATION_KEY, { duration: PREF.DEFAULT_DURATION }],
      [PREF.DEFAULT_MOVIES_AGE_KEY, { moviesAge: [], seriesAge: [] }],
      [PREF.DEFAULT_TV_AGE_KEY, { moviesAge: [], seriesAge: [] }],
    ];

    it.each(CASES)('resetCriterion(%s) remet cette clé à sa valeur par défaut et ne touche à aucune autre', (key, changes) => {
      service.setAllCriteria(populated());

      api().resetCriterion(key);

      expect(service.criteria()).toEqual({ ...populated(), ...changes });
    });

    it('resetCriterion(notes) ne réinitialise pas les autres critères (régression : tout était effacé)', () => {
      service.setAllCriteria(populated());

      api().resetCriterion(PREF.DEFAULT_NOTES_KEY);

      expect(service.noteHelpers.items()).toBe(7);
      expect(service.countryHelpers.items()).toEqual([FRANCE]);
      expect(service.notesHelpers.isDefault()).toBe(true);
    });

    it('chaque menu de CRITERIA_LIST a un cas de réinitialisation testé', () => {
      const testedKeys = new Set(CASES.map(([key]) => key));
      const menuKeys = PREF.CRITERIA_LIST.flatMap(group => group.item.map(item => item.key));

      menuKeys.forEach(key => expect(testedKeys.has(key), `clé non couverte : ${key}`).toBe(true));
    });

    it('resetCriterion ne touche ni au tri ni aux plateformes', () => {
      service.setAllCriteria(populated());
      service.sortHelpers.movie.set('title.asc');
      service.setProviders([provider(8)]);

      api().resetCriterion(PREF.DEFAULT_NOTE_KEY);

      expect(service.sortHelpers.movie.items()).toBe('title.asc');
      expect(service.providerHelpers.items()).toEqual([provider(8)]);
    });

    it('resetCriterion est enregistré dans le localStorage', () => {
      service.setAllCriteria(populated());

      api().resetCriterion(PREF.DEFAULT_NOTE_KEY);
      TestBed.tick();

      expect(stored()?.criteria?.note).toBe(PREF.DEFAULT_NOTE);
    });

    it('resetCriterion sur un critère déjà par défaut ne change rien', () => {
      api().resetCriterion(PREF.DEFAULT_NOTE_KEY);

      expect(service.noteHelpers.isDefault()).toBe(true);
      expect(service.criteria()?.note).toBe(PREF.DEFAULT_NOTE);
    });

    it('resetAllCriteria efface tous les critères mais conserve le tri et les plateformes', () => {
      service.setAllCriteria(populated());
      service.sortHelpers.tv.set('name.asc');
      service.setProviders([provider(8)]);

      api().resetAllCriteria();

      expect(service.criteria()).toEqual({});
      expect(service.sortHelpers.tv.items()).toBe('name.asc');
      expect(service.providerHelpers.items()).toEqual([provider(8)]);
    });

    it('resetAllCriteria remet tous les helpers « par défaut » ou vides', () => {
      service.setAllCriteria(populated());

      api().resetAllCriteria();

      expect(service.releaseDateHelpers.isDefault()).toBe(true);
      expect(service.noteHelpers.isDefault()).toBe(true);
      expect(service.notesHelpers.isDefault()).toBe(true);
      expect(service.durationHelpers.isDefault()).toBe(true);
      expect(service.genreHelpers.hasItems()).toBe(false);
      expect(service.genreExcludedHelpers.hasItems()).toBe(false);
      expect(service.countryHelpers.hasItems()).toBe(false);
      expect(service.ageMoviesHelpers.hasItems()).toBe(false);
      expect(service.ageSeriesHelpers.hasItems()).toBe(false);
    });
  });
});
