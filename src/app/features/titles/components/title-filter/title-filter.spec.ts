import { Component, input, output } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { HarnessLoader } from '@angular/cdk/testing';
import { MatButtonToggleGroupHarness } from '@angular/material/button-toggle/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Genre, Provider } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { COMMON_SORT_OPTIONS, MOVIE_SORT_OPTIONS, SERIES_SORT_OPTIONS } from '@shared/constants/sort-options';
import * as PREF from '@shared/constants/filter-preferences';
import { AllSortOptions } from '@shared/types/collection.types';
import { TitleFilterComponent } from './title-filter';
import { TitleFilterCriteriaComponent } from './title-filter-criteria/title-filter-criteria';
import { TitleFilterProvidersComponent } from './title-filter-providers/title-filter-providers';

/** Doubles des composants enfants : on teste ici le contrat (inputs / outputs), pas leur rendu. */
@Component({ selector: 'title-filter-providers', template: '' })
class StubProvidersComponent {
  readonly providers = input<Provider[]>([]);
  readonly count = input<number>(1);
}

@Component({ selector: 'title-filter-criteria', template: '' })
class StubCriteriaComponent {
  readonly resetSort = input<AllSortOptions>();
  readonly resetSortChange = output<AllSortOptions>();
}

const provider = (id: number): Provider => ({ provider_id: id, provider_name: `Provider ${id}`, logo_path: `/p${id}.png` });
const genre: Genre = { id: 28, name: 'Action' };

describe('TitleFilterComponent', () => {
  let fixture: ComponentFixture<TitleFilterComponent>;
  let component: TitleFilterComponent;
  let prefs: UserPreferencesService;
  let navigate: ReturnType<typeof vi.spyOn>;
  let loader: HarnessLoader;

  const host = () => fixture.nativeElement as HTMLElement;
  const query = <T extends HTMLElement>(selector: string) => host().querySelector<T>(selector);

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({
      imports: [TitleFilterComponent],
      providers: [provideRouter([])],
    })
      .overrideComponent(TitleFilterComponent, {
        remove: { imports: [TitleFilterProvidersComponent, TitleFilterCriteriaComponent] },
        add: { imports: [StubProvidersComponent, StubCriteriaComponent] },
      })
      .compileComponents();

    prefs = TestBed.inject(UserPreferencesService);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(TitleFilterComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  });

  describe('type de média', () => {
    it('utilise le média par défaut', () => {
      expect(component.currentMediaType()).toBe(PREF.DEFAULT_MEDIA);
      expect(component.selectedFilter()).toBe(PREF.DEFAULT_MEDIA);
    });

    it('synchronise selectedFilter quand currentMediaType change', async () => {
      fixture.componentRef.setInput('currentMediaType', 'tv');
      await fixture.whenStable();

      expect(component.selectedFilter()).toBe('tv');
    });

    it('reflète le média courant dans le groupe de boutons', async () => {
      fixture.componentRef.setInput('currentMediaType', 'tv');
      const group = await loader.getHarness(MatButtonToggleGroupHarness);

      const toggles = await group.getToggles();
      const labels = await Promise.all(toggles.map(t => t.getText()));
      const checked = await Promise.all(toggles.map(t => t.isChecked()));

      expect(labels).toEqual(['Tout', 'Films', 'Séries']);
      expect(checked).toEqual([false, false, true]);
    });

    it.each([
      ['all', 'Tout', ['/popular/all']],
      ['movie', 'Films', ['/popular/movies']],
      ['tv', 'Séries', ['/popular/series']],
    ] as const)('onFilterChange(%s) met à jour le filtre et navigue vers la bonne route', (value, _label, route) => {
      component.onFilterChange(value);

      expect(component.selectedFilter()).toBe(value);
      expect(navigate).toHaveBeenCalledExactlyOnceWith(route);
    });

    it('un clic sur un bouton du groupe déclenche la navigation', async () => {
      const group = await loader.getHarness(MatButtonToggleGroupHarness);

      await (await group.getToggles({ text: 'Séries' }))[0].check();

      expect(component.selectedFilter()).toBe('tv');
      expect(navigate).toHaveBeenCalledExactlyOnceWith(['/popular/series']);
    });
  });

  describe('options de tri', () => {
    it.each([
      ['movie', MOVIE_SORT_OPTIONS],
      ['tv', SERIES_SORT_OPTIONS],
      ['all', COMMON_SORT_OPTIONS],
    ] as const)('propose les bonnes options pour %s', (media, expected) => {
      fixture.componentRef.setInput('currentMediaType', media);

      expect(component.selectOptionsByMedia()).toBe(expected);
    });

    it('l\'onglet "Tout" ne propose pas de tri propre aux films ou aux séries', () => {
      fixture.componentRef.setInput('currentMediaType', 'all');
      const values = component.selectOptionsByMedia().map(o => o.value);

      expect(values).toEqual(['popularity.desc', 'vote_average.desc']);
    });

    it('selectSort met à jour le tri du média courant uniquement', () => {
      fixture.componentRef.setInput('currentMediaType', 'tv');

      component.selectSort('name.asc');

      expect(prefs.sortHelpers.tv.items()).toBe('name.asc');
      expect(prefs.sortHelpers.movie.items()).toBe(PREF.DEFAULT_SORT);
      expect(prefs.sortHelpers.all.items()).toBe(PREF.DEFAULT_SORT);
    });

    it('selectedOptionByMedia lit le tri du média courant', () => {
      prefs.sortHelpers.movie.set('title.asc');
      prefs.sortHelpers.tv.set('name.asc');

      expect(component.selectedOptionByMedia()).toBe('title.asc');

      fixture.componentRef.setInput('currentMediaType', 'tv');
      expect(component.selectedOptionByMedia()).toBe('name.asc');
    });

    it('activeSort est faux avec le tri par défaut, vrai sinon (par média)', () => {
      expect(component.activeSort()).toBe(false);

      prefs.sortHelpers.movie.set('release_date.desc');
      expect(component.activeSort()).toBe(true);

      fixture.componentRef.setInput('currentMediaType', 'tv');
      expect(component.activeSort()).toBe(false);
    });

    it('onResetSortChange applique la valeur reçue au média courant', () => {
      prefs.sortHelpers.movie.set('title.asc');

      component.onResetSortChange(PREF.DEFAULT_SORT);

      expect(prefs.sortHelpers.movie.items()).toBe(PREF.DEFAULT_SORT);
      expect(component.activeSort()).toBe(false);
    });

    it('le menu liste les options du média et marque l\'option active', async () => {
      prefs.sortHelpers.movie.set('vote_average.desc');
      const menu = await loader.getHarness(MatMenuHarness);

      await menu.open();
      const items = await menu.getItems();
      const labels = await Promise.all(items.map(i => i.getText()));
      const active = await Promise.all(items.map(async i => (await i.host()).hasClass('is-active')));

      expect(labels).toEqual(['Popularité', 'Mieux notés', 'Année de sortie', 'Box-office', 'Alphabétique']);
      expect(active).toEqual([false, true, false, false, false]);
    });

    it('un clic sur une option du menu change le tri', async () => {
      const menu = await loader.getHarness(MatMenuHarness);

      await menu.clickItem({ text: 'Box-office' });

      expect(prefs.sortHelpers.movie.items()).toBe('revenue.desc');
    });

    it('le bouton de tri est mis en évidence quand le tri n\'est pas celui par défaut', async () => {
      const sortButton = () => query('button[aria-label="Trier"]');
      expect(sortButton()?.classList.contains('is-active')).toBe(false);

      prefs.sortHelpers.movie.set('title.asc');
      await fixture.whenStable();

      expect(sortButton()?.classList.contains('is-active')).toBe(true);
    });
  });

  describe('plateformes', () => {
    it('expose les plateformes et leur nombre depuis les préférences', () => {
      expect(component.selectedProviders()).toEqual([]);
      expect(component.countProviders()).toBe(0);

      prefs.setProviders([provider(8), provider(337)]);

      expect(component.selectedProviders()).toEqual([provider(8), provider(337)]);
      expect(component.countProviders()).toBe(2);
    });

    it('affiche au plus 5 logos mais le nombre total dans le badge', async () => {
      prefs.setProviders([1, 2, 3, 4, 5, 6, 7].map(provider));
      await fixture.whenStable();

      expect(host().querySelectorAll('.platforms__icon')).toHaveLength(5);
      expect(query('.platforms__badge')?.textContent?.trim()).toBe('7');
    });

    it('construit l\'URL du logo via TMDB et renseigne l\'alt', async () => {
      prefs.setProviders([provider(8)]);
      await fixture.whenStable();

      const icon = query<HTMLImageElement>('.platforms__icon');
      expect(icon?.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w45/p8.png');
      expect(icon?.getAttribute('alt')).toBe('Provider 8');
    });

    it('le panneau des plateformes est masqué par défaut puis bascule au clic', async () => {
      const stub = () => fixture.debugElement.query(By.directive(StubProvidersComponent));
      expect(stub()).toBeNull();

      query('button[aria-label="Plateformes disponibles"]')?.click();
      await fixture.whenStable();
      expect(component.isFilterProviderPanelExpanded()).toBe(true);
      expect(stub()).not.toBeNull();

      query('button[aria-label="Plateformes disponibles"]')?.click();
      await fixture.whenStable();
      expect(stub()).toBeNull();
    });

    it('transmet plateformes et compteur au panneau', async () => {
      prefs.setProviders([provider(8), provider(337)]);
      component.isFilterProviderPanelExpanded.set(true);
      await fixture.whenStable();

      const panel = fixture.debugElement.query(By.directive(StubProvidersComponent)).componentInstance as StubProvidersComponent;
      expect(panel.providers()).toEqual([provider(8), provider(337)]);
      expect(panel.count()).toBe(2);
    });
  });

  describe('compteur de filtres actifs', () => {
    it('vaut 0 par défaut', () => {
      expect(component.activeCountFilters()).toBe(0);
    });

    it('compte les genres inclus', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre]);

      expect(component.activeCountFilters()).toBe(1);
    });

    it('compte les genres exclus', () => {
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [genre]);

      expect(component.activeCountFilters()).toBe(1);
    });

    it('ne compte qu\'une fois le critère genres, même avec inclusion ET exclusion', () => {
      prefs.setCriteria(PREF.DEFAULT_GENDERS_KEY, [genre]);
      prefs.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, [{ id: 35, name: 'Comédie' }]);

      expect(component.activeCountFilters()).toBe(1);
    });

    it('compte l\'année de sortie seulement si elle diffère de la plage par défaut', () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { ...PREF.DEFAULT_RELEASE_DATE });
      expect(component.activeCountFilters()).toBe(0);

      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 1990, max: 2000 });
      expect(component.activeCountFilters()).toBe(1);
    });

    it('compte la note, le nombre de notes, le pays et la durée', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      expect(component.activeCountFilters()).toBe(1);

      prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 200);
      expect(component.activeCountFilters()).toBe(2);

      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [{ id: PREF.COUNTRY_ID('FR'), code: 'FR', name: 'France' }]);
      expect(component.activeCountFilters()).toBe(3);

      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 1, max: 2 });
      expect(component.activeCountFilters()).toBe(4);
    });

    it('la durée par défaut n\'est pas comptée', () => {
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { ...PREF.DEFAULT_DURATION });

      expect(component.activeCountFilters()).toBe(0);
    });

    it('cumule tous les critères suivis', () => {
      prefs.setAllCriteria({
        genders: [genre],
        release: { min: 1990, max: 2000 },
        note: 7,
        notes: 200,
        country: [{ id: PREF.COUNTRY_ID('FR'), code: 'FR', name: 'France' }],
        duration: { min: 1, max: 2 },
        moviesAge: [{ id: 1, certification: 'U', meaning: 'Tous publics', order: 1 }],
        seriesAge: [{ id: 1, certification: '10', meaning: 'Moins de 10 ans', order: 1 }],
      });

      expect(component.activeCountFilters()).toBe(8);
    });

    it('compte chaque liste d\'âge renseignée', () => {
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [{ id: 1, certification: 'U', meaning: 'Tous publics', order: 1 }]);
      expect(component.activeCountFilters()).toBe(1);

      prefs.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [{ id: 1, certification: '10', meaning: 'Moins de 10 ans', order: 1 }]);
      expect(component.activeCountFilters()).toBe(2);
    });

    // À CONFIRMER : une sélection synchronisée (même certification cochée côté films ET séries)
    // compte pour 2 dans le badge, alors que l'utilisateur voit un seul critère « Âge » actif.
    it('une certification commune cochée des deux côtés compte deux fois (comportement actuel)', () => {
      const twelve = { id: 2, certification: '12', meaning: 'Moins de 12 ans', order: 2 };
      prefs.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, [twelve]);
      prefs.setCriteria(PREF.DEFAULT_TV_AGE_KEY, [twelve]);

      expect(component.activeCountFilters()).toBe(2);
    });

    it('le tri et les plateformes n\'entrent pas dans le compteur', () => {
      prefs.sortHelpers.movie.set('title.asc');
      prefs.setProviders([provider(8)]);

      expect(component.activeCountFilters()).toBe(0);
    });

    it('un reset des critères remet le compteur à 0', () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      prefs.setAllCriteria({});

      expect(component.activeCountFilters()).toBe(0);
    });
  });

  describe('rendu', () => {
    it('affiche le nombre de titres formaté', async () => {
      fixture.componentRef.setInput('countTitles', 1234);
      await fixture.whenStable();

      expect(query('.filter-items__count')?.textContent).toContain('1,234 Titres');
    });

    it('marque le compteur en cours de chargement', async () => {
      const counter = () => query('.filter-items__count');
      expect(counter()?.classList.contains('filter-items__count--loading')).toBe(false);

      fixture.componentRef.setInput('isLoading', true);
      await fixture.whenStable();

      expect(counter()?.classList.contains('filter-items__count--loading')).toBe(true);
    });

    it('masque le badge des filtres quand aucun filtre n\'est actif, l\'affiche sinon', async () => {
      const badge = () => query('.filters__badge');
      expect(badge()?.style.display).toBe('none');

      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      prefs.setCriteria(PREF.DEFAULT_COUNTRY_KEY, [{ id: PREF.COUNTRY_ID('FR'), code: 'FR', name: 'France' }]);
      await fixture.whenStable();

      expect(badge()?.style.display).toBe('inline-block');
      expect(badge()?.textContent?.trim()).toBe('2');
      expect(query('button[aria-label="Filtres"]')?.classList.contains('is-active')).toBe(true);
    });

    it('le panneau des critères est masqué par défaut puis bascule au clic', async () => {
      const stub = () => fixture.debugElement.query(By.directive(StubCriteriaComponent));
      expect(stub()).toBeNull();

      query('button[aria-label="Filtres"]')?.click();
      await fixture.whenStable();
      expect(component.isFilterCriteriaPanelExpanded()).toBe(true);
      expect(stub()).not.toBeNull();

      query('button[aria-label="Filtres"]')?.click();
      await fixture.whenStable();
      expect(stub()).toBeNull();
    });

    it('transmet le tri courant au panneau des critères', async () => {
      prefs.sortHelpers.movie.set('title.asc');
      component.isFilterCriteriaPanelExpanded.set(true);
      await fixture.whenStable();

      const panel = fixture.debugElement.query(By.directive(StubCriteriaComponent)).componentInstance as StubCriteriaComponent;
      expect(panel.resetSort()).toBe('title.asc');
    });

    it('applique le tri émis par le panneau des critères (bouton Réinitialiser)', async () => {
      prefs.sortHelpers.movie.set('title.asc');
      component.isFilterCriteriaPanelExpanded.set(true);
      await fixture.whenStable();

      const panel = fixture.debugElement.query(By.directive(StubCriteriaComponent)).componentInstance as StubCriteriaComponent;
      panel.resetSortChange.emit(PREF.DEFAULT_SORT);

      expect(prefs.sortHelpers.movie.items()).toBe(PREF.DEFAULT_SORT);
    });
  });
});
