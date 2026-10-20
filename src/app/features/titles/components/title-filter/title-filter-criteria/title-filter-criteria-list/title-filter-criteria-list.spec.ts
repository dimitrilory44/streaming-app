import { ComponentFixture, TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { beforeEach, describe, expect, it } from 'vitest';

import { Certification, Country, Criteria, CriteriaListItem, Genre } from '@core/models/media-model';
import { TmdbApiService } from '@core/services/tmdb-api';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';
import { ArrayKeys } from '@shared/types/collection.types';
import { TitleFilterCriteriaListComponent } from './title-filter-criteria-list';

type ListCriterion = CriteriaListItem<ArrayKeys<Criteria> & keyof Criteria>;

const ACTION: Genre = { id: 28, name: 'Action' };
const COMEDIE: Genre = { id: 35, name: 'Comédie' };
const GENRES = [ACTION, COMEDIE];

const country = (code: string, name: string): Country => ({ id: PREF.COUNTRY_ID(code), code, name });
const FR = country('FR', 'France');
const US = country('US', 'États-Unis');
const DE = country('DE', 'Allemagne');
const IT = country('IT', 'Italie');
const JP = country('JP', 'Japon');
const COUNTRIES = [IT, JP, DE, US, FR]; // volontairement dans le désordre

const CERTIFS_MOVIE: Certification[] = [
  { id: 1, certification: 'U', meaning: 'Tous publics', order: 1 },
  { id: 2, certification: '12', meaning: 'Moins de 12 ans', order: 2 },
  { id: 3, certification: '16', meaning: 'Moins de 16 ans', order: 3 },
];
const CERTIFS_TV: Certification[] = [
  { id: 1, certification: '10', meaning: 'Moins de 10 ans', order: 1 },
  { id: 2, certification: '12', meaning: 'Moins de 12 ans', order: 2 },
  { id: 3, certification: '16', meaning: 'Moins de 16 ans', order: 3 },
];

describe('TitleFilterCriteriaListComponent', () => {
  let fixture: ComponentFixture<TitleFilterCriteriaListComponent>;
  let component: TitleFilterCriteriaListComponent;
  let prefs: UserPreferencesService;
  const certificationsMovie = signal<Certification[]>(CERTIFS_MOVIE);
  const certificationsSerie = signal<Certification[]>(CERTIFS_TV);

  const host = () => fixture.nativeElement as HTMLElement;
  const checkboxes = () => Array.from(host().querySelectorAll<HTMLElement>('mat-checkbox'));
  const labels = () => checkboxes().map(c => c.textContent?.trim());
  const isChecked = (el: HTMLElement) => el.querySelector<HTMLInputElement>('input')!.checked;
  const clickCheckbox = async (index: number) => {
    checkboxes()[index].click();
    await fixture.whenStable();
  };

  const setCriterion = async (criterion: ListCriterion) => {
    fixture.componentRef.setInput('criterion', criterion);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();
    certificationsMovie.set(CERTIFS_MOVIE);
    certificationsSerie.set(CERTIFS_TV);

    await TestBed.configureTestingModule({
      imports: [TitleFilterCriteriaListComponent],
      providers: [{
        provide: TmdbApiService,
        useValue: { certificationsMovie, certificationsSerie },
      }],
    }).compileComponents();

    prefs = TestBed.inject(UserPreferencesService);
    fixture = TestBed.createComponent(TitleFilterCriteriaListComponent);
    component = fixture.componentInstance;
  });

  describe('genres', () => {
    beforeEach(async () => {
      await setCriterion({ key: 'genders', type: 'list', value: GENRES });
    });

    it('affiche un checkbox par genre', () => {
      expect(labels()).toEqual(['Action', 'Comédie']);
      expect(checkboxes().map(isChecked)).toEqual([false, false]);
    });

    it('genderStates reflète les genres inclus et exclus', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [ACTION]);
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [COMEDIE]);

      expect(component.genderStates().get(ACTION.id)).toBe('includedGenders');
      expect(component.genderStates().get(COMEDIE.id)).toBe('excludedGenders');
      expect(component.genderStates().get(999)).toBeUndefined();
    });

    it('seul un genre inclus apparaît coché', async () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [ACTION]);
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [COMEDIE]);
      await fixture.whenStable();

      expect(checkboxes().map(isChecked)).toEqual([true, false]);
    });

    describe('cycleGender', () => {
      it('aucun → inclus', () => {
        component.cycleGender(ACTION);

        expect(prefs.genreHelpers.items()).toEqual([ACTION]);
        expect(prefs.genreExcludedHelpers.items()).toEqual([]);
      });

      it('inclus → exclu', () => {
        prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [ACTION]);

        component.cycleGender(ACTION);

        expect(prefs.genreHelpers.items()).toEqual([]);
        expect(prefs.genreExcludedHelpers.items()).toEqual([ACTION]);
      });

      it('exclu → aucun', () => {
        prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [ACTION]);

        component.cycleGender(ACTION);

        expect(prefs.genreHelpers.items()).toEqual([]);
        expect(prefs.genreExcludedHelpers.items()).toEqual([]);
      });

      it('un cycle complet revient à l\'état initial', () => {
        component.cycleGender(ACTION);
        component.cycleGender(ACTION);
        component.cycleGender(ACTION);

        expect(component.genderStates().get(ACTION.id)).toBeUndefined();
      });

      it('ne modifie pas les autres genres', () => {
        prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [COMEDIE]);

        component.cycleGender(ACTION);

        expect(prefs.genreHelpers.items()).toEqual([ACTION, COMEDIE]);
      });
    });

    it('un clic sur le checkbox fait avancer le cycle sans basculer le checkbox natif', async () => {
      await clickCheckbox(0);
      expect(prefs.genreHelpers.items()).toEqual([ACTION]);

      await clickCheckbox(0);
      expect(prefs.genreHelpers.items()).toEqual([]);
      expect(prefs.genreExcludedHelpers.items()).toEqual([ACTION]);
    });

    it('affiche un bouton d\'exclusion pour un genre exclu, qui permet de le retirer', async () => {
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [COMEDIE]);
      await fixture.whenStable();

      const badge = host().querySelector<HTMLButtonElement>('button .exclude-badge__label');
      expect(badge?.textContent?.trim()).toBe('Comédie');

      badge!.closest('button')!.click();
      await fixture.whenStable();

      expect(prefs.genreExcludedHelpers.items()).toEqual([]);
      expect(host().querySelector('.exclude-badge')).toBeNull();
    });

    it('marque le checkbox d\'un genre exclu avec la classe is-display', async () => {
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [COMEDIE]);
      await fixture.whenStable();

      expect(checkboxes()[1].classList.contains('is-display')).toBe(true);
      expect(checkboxes()[0].classList.contains('is-display')).toBe(false);
    });
  });

  describe('pays', () => {
    const criterion = (overrides: Partial<ListCriterion> = {}): ListCriterion => ({
      key: 'country',
      type: 'list',
      value: COUNTRIES,
      pinnedIds: [FR.id, US.id],
      pageSize: 3,
      ...overrides,
    });

    it('place les pays épinglés en premier, dans l\'ordre d\'épinglage', async () => {
      await setCriterion(criterion({ pageSize: undefined }));

      expect(labels()).toEqual(['France', 'États-Unis', 'Italie', 'Japon', 'Allemagne']);
    });

    it('limite l\'affichage à pageSize et indique le nombre restant', async () => {
      await setCriterion(criterion());

      expect(labels()).toEqual(['France', 'États-Unis', 'Italie']);
      expect(component.remaining()).toBe(2);
      expect(host().querySelector('.criteria-panel__list__more')).not.toBeNull();
    });

    it('showMore affiche pageSize pays de plus, puis masque le bouton', async () => {
      await setCriterion(criterion());

      component.showMore();
      await fixture.whenStable();

      expect(labels()).toHaveLength(5);
      expect(component.remaining()).toBe(0);
      expect(host().querySelector('.criteria-panel__list__more')).toBeNull();
    });

    it('le bouton « Voir plus » charge la suite', async () => {
      await setCriterion(criterion());

      host().querySelector<HTMLButtonElement>('.criteria-panel__list__more')!.click();
      await fixture.whenStable();

      expect(labels()).toHaveLength(5);
    });

    it('sans pageSize, tous les pays sont visibles et il n\'y a pas de bouton', async () => {
      await setCriterion(criterion({ pageSize: undefined }));

      expect(labels()).toHaveLength(5);
      expect(component.remaining()).toBe(0);
      expect(host().querySelector('.criteria-panel__list__more')).toBeNull();
    });

    it('un pays sélectionné au-delà de la limite reste visible', async () => {
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [JP]);
      await setCriterion(criterion());

      expect(labels()).toEqual(['France', 'États-Unis', 'Italie', 'Japon']);
    });

    it('coche et décoche un pays au clic', async () => {
      await setCriterion(criterion());

      await clickCheckbox(0);
      expect(prefs.countryHelpers.items()).toEqual([FR]);
      expect(isChecked(checkboxes()[0])).toBe(true);

      await clickCheckbox(0);
      expect(prefs.countryHelpers.items()).toEqual([]);
    });

    it('conserve la sélection triée par id', () => {
      component.toggleItem(PREF.DEFAULT_COUNTRY_KEY, US);
      component.toggleItem(PREF.DEFAULT_COUNTRY_KEY, FR);

      const ids = prefs.countryHelpers.items().map(c => c.id);
      expect(ids).toEqual([...ids].sort((a, b) => a - b));
    });

    it('pageSize absent de la sélection : la liste vide ne plante pas', async () => {
      await setCriterion(criterion({ value: undefined }));

      expect(labels()).toEqual([]);
      expect(component.remaining()).toBe(0);
    });

    describe('« Voir plus » (limit)', () => {
      const expand = async () => {
        await setCriterion(criterion());
        component.showMore();
        await fixture.whenStable();
        expect(labels()).toHaveLength(5);
      };

      it('reste déplié quand `criterion` est recréé à l\'identique', async () => {
        await expand();

        await setCriterion(criterion()); // nouvel objet, même contenu

        expect(labels()).toHaveLength(5);
      });

      it('reste déplié quand on coche un pays puis que le parent recrée `criterion`', async () => {
        await expand();

        await clickCheckbox(0);
        await setCriterion(criterion());

        expect(prefs.countryHelpers.items()).toEqual([FR]);
        expect(labels()).toHaveLength(5);
      });

      it('se replie quand la sélection est réinitialisée', async () => {
        await expand();
        await clickCheckbox(0);
        await setCriterion(criterion());

        prefs.resetCriterion(PREF.DEFAULT_COUNTRY_KEY);
        await setCriterion(criterion());

        expect(labels()).toEqual(['France', 'États-Unis', 'Italie']);
        expect(component.remaining()).toBe(2);
      });

      it('se replie aussi quand on décoche le dernier pays (comportement assumé)', async () => {
        await expand();
        await clickCheckbox(0);

        await clickCheckbox(0);

        expect(prefs.countryHelpers.hasItems()).toBe(false);
        expect(labels()).toHaveLength(3);
      });

      it('ne se replie pas quand on coche un premier pays', async () => {
        await expand();

        await clickCheckbox(0);

        expect(labels()).toHaveLength(5);
      });
    });
  });

  describe('âges (certifications)', () => {
    beforeEach(async () => {
      await setCriterion({ key: 'moviesAge', type: 'list', value: CERTIFS_MOVIE });
    });

    it('affiche une case par certification', () => {
      expect(labels()).toEqual(['U', '12', '16']);
    });

    it('isSelectionSelectedByCertif regroupe les sélections films et séries', () => {
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [CERTIFS_MOVIE[0]]);
      prefs.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [CERTIFS_TV[0]]);

      expect(component.isSelectionSelectedByCertif('U')).toBe(true);
      expect(component.isSelectionSelectedByCertif('10')).toBe(true);
      expect(component.isSelectionSelectedByCertif('16')).toBe(false);
    });

    it('cocher une certification commune met à jour films ET séries', async () => {
      await clickCheckbox(1); // « 12 »

      expect(prefs.ageMoviesHelpers.items().map(c => c.certification)).toEqual(['12']);
      expect(prefs.ageSeriesHelpers.items().map(c => c.certification)).toEqual(['12']);
      expect(isChecked(checkboxes()[1])).toBe(true);
    });

    it('chaque clé reçoit l\'objet de SA liste (id et order propres)', () => {
      const movie12 = { id: 20, certification: '12', meaning: 'Films 12', order: 20 };
      const tv12 = { id: 30, certification: '12', meaning: 'Séries 12', order: 30 };
      certificationsMovie.set([movie12]);
      certificationsSerie.set([tv12]);

      component.toggleCertification(movie12);

      expect(prefs.ageMoviesHelpers.items()).toEqual([movie12]);
      expect(prefs.ageSeriesHelpers.items()).toEqual([tv12]);
    });

    it('décocher la certification la retire des deux clés', async () => {
      await clickCheckbox(1);
      await clickCheckbox(1);

      expect(prefs.ageMoviesHelpers.items()).toEqual([]);
      expect(prefs.ageSeriesHelpers.items()).toEqual([]);
    });

    it('une certification propre aux séries n\'est pas écrite côté films', () => {
      component.toggleCertification(CERTIFS_TV[0]); // « 10 »

      expect(prefs.ageSeriesHelpers.items().map(c => c.certification)).toEqual(['10']);
      expect(prefs.ageMoviesHelpers.items()).toEqual([]);
    });

    it('une certification propre aux films n\'est pas écrite côté séries', () => {
      component.toggleCertification(CERTIFS_MOVIE[0]); // « U »

      expect(prefs.ageMoviesHelpers.items().map(c => c.certification)).toEqual(['U']);
      expect(prefs.ageSeriesHelpers.items()).toEqual([]);
    });

    it('une certification inconnue des deux listes est ignorée', () => {
      component.toggleCertification({ id: 99, certification: 'XX', meaning: '?', order: 99 });

      expect(prefs.ageMoviesHelpers.items()).toEqual([]);
      expect(prefs.ageSeriesHelpers.items()).toEqual([]);
    });

    it('resynchronise des sélections divergentes au clic', () => {
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [CERTIFS_MOVIE[1]]); // « 12 » seulement côté films

      component.toggleCertification(CERTIFS_MOVIE[1]); // déjà « sélectionnée » → décoche partout

      expect(prefs.ageMoviesHelpers.items()).toEqual([]);
      expect(prefs.ageSeriesHelpers.items()).toEqual([]);
    });

    it('trie les certifications sélectionnées par order', () => {
      component.toggleCertification(CERTIFS_MOVIE[2]); // 16
      component.toggleCertification(CERTIFS_MOVIE[1]); // 12

      expect(prefs.ageMoviesHelpers.items().map(c => c.certification)).toEqual(['12', '16']);
    });

    it('ne touche pas aux autres critères', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);

      component.toggleCertification(CERTIFS_MOVIE[1]);

      expect(prefs.noteHelpers.items()).toBe(7);
    });

    it('la liste « séries » affiche aussi la sélection commune', async () => {
      component.toggleCertification(CERTIFS_MOVIE[1]);
      await setCriterion({ key: 'seriesAge', type: 'list', value: CERTIFS_TV });

      expect(labels()).toEqual(['10', '12', '16']);
      expect(checkboxes().map(isChecked)).toEqual([false, true, false]);
    });
  });

  describe('isSelectionSelected', () => {
    it('renvoie false pour une clé non gérée', () => {
      expect(component.isSelectionSelected('note', 1)).toBe(false);
    });
  });
});
