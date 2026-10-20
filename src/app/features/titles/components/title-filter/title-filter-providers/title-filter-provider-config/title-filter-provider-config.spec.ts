import { Directive, input, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HarnessLoader } from '@angular/cdk/testing';
import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { MatCheckboxHarness } from '@angular/material/checkbox/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Provider, ProviderConfigData, Providers, ProvidersState } from '@core/models/media-model';
import { OnlineStatusService } from '@core/services/online-status.service';
import { TmdbApiService } from '@core/services/tmdb-api';
import { SwiperDirective } from '@shared/directives/swiper.directive';
import { TitleFilterProviderConfigComponent } from './title-filter-provider-config';

/** Swiper manipule le DOM réel : on le remplace par une directive sans effet. */
@Directive({ selector: '[appSwiper]' })
class StubSwiperDirective {
  readonly config = input<unknown>({});
}

const provider = (id: number, name = `Provider ${id}`): Provider => ({ provider_id: id, provider_name: name, logo_path: `/logo${id}.png` });

/** Reproduit la forme de `ProvidersState` renvoyée par `TmdbApiService.getProviders*()`. */
function makeState(results: Provider[] | undefined) {
  const value = signal(results ? ({ results } as unknown as Providers) : undefined);
  const isLoading = signal(false);
  const error = signal<Error | undefined>(undefined);
  const reload = vi.fn();
  return { value, isLoading, error, reload } satisfies ProvidersState<Providers> & { reload: ReturnType<typeof vi.fn> };
}

describe('TitleFilterProviderConfigComponent', () => {
  let fixture: ComponentFixture<TitleFilterProviderConfigComponent>;
  let component: TitleFilterProviderConfigComponent;
  let loader: HarnessLoader;

  let movies: ReturnType<typeof makeState>;
  let series: ReturnType<typeof makeState>;
  let isOnline: ReturnType<typeof signal<boolean>>;
  let backdrop$: Subject<MouseEvent>;
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean; backdropClick: () => Subject<MouseEvent> };
  let dialogData: ProviderConfigData;

  const host = () => fixture.nativeElement as HTMLElement;
  const names = () => Array.from(host().querySelectorAll('.provider-name')).map(e => e.textContent?.trim());
  const ids = (list: Provider[]) => list.map(p => p.provider_id);

  /** Dans l'état par défaut : films [30, 10, 20] et séries [20, 40] (20 en commun), volontairement non triés. */
  async function create(selected: Provider[] = []) {
    dialogData = { providers: selected };
    fixture = TestBed.createComponent(TitleFilterProviderConfigComponent);
    component = fixture.componentInstance;
    loader = TestbedHarnessEnvironment.loader(fixture);
    await fixture.whenStable();
  }

  beforeEach(async () => {
    localStorage.clear();
    movies = makeState([provider(30, 'Netflix'), provider(10, 'Disney+'), provider(20, 'Canal+')]);
    series = makeState([provider(20, 'Canal+'), provider(40, 'Apple TV+')]);
    isOnline = signal(true);
    backdrop$ = new Subject<MouseEvent>();
    dialogRef = { close: vi.fn(), disableClose: false, backdropClick: () => backdrop$ };
    dialogData = { providers: [] };

    await TestBed.configureTestingModule({
      imports: [TitleFilterProviderConfigComponent],
      providers: [
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useFactory: () => dialogData },
        {
          provide: TmdbApiService,
          useValue: { getProvidersMovies: () => movies, getProvidersSeries: () => series },
        },
        { provide: OnlineStatusService, useValue: { isOnline } },
      ],
    })
      .overrideComponent(TitleFilterProviderConfigComponent, {
        remove: { imports: [SwiperDirective] },
        add: { imports: [StubSwiperDirective] },
      })
      .compileComponents();
  });

  describe('liste des plateformes', () => {
    it('fusionne films et séries sans doublon (par provider_id)', async () => {
      await create();

      expect(ids(component.allProviders())).toEqual([30, 10, 20, 40]);
      expect(names()).toEqual(['Netflix', 'Disney+', 'Canal+', 'Apple TV+']);
    });

    it('affiche le titre de la boîte de dialogue une fois les données chargées', async () => {
      await create();

      expect(host().querySelector('h2')?.textContent).toContain('Choisissez vos services de streaming');
    });

    it('affiche un indicateur de chargement tant que rien n\'est arrivé', async () => {
      movies = makeState(undefined);
      series = makeState(undefined);
      movies.isLoading.set(true);
      series.isLoading.set(true);
      await create();

      expect(host().querySelector('mat-spinner')).not.toBeNull();
      expect(host().querySelector('h2')).toBeNull();
    });

    it('affiche le message hors connexion en cas d\'erreur', async () => {
      movies = makeState(undefined);
      series = makeState(undefined);
      movies.error.set(new Error('réseau'));
      await create();

      expect(host().querySelector('state-message')?.textContent).toContain('hors connexion');
      expect(host().querySelector('h2')).toBeNull();
    });
  });

  describe('sélection', () => {
    it('part de la sélection transmise à la boîte de dialogue', async () => {
      await create([provider(10, 'Disney+')]);

      expect(ids(component.selectedProviders())).toEqual([10]);
      expect(component.isSelected(10)).toBe(true);
      expect(component.isSelected(20)).toBe(false);
      expect(host().textContent).toContain('1 service(s) de streaming selectionnés');
    });

    it('toggleProvider ajoute une plateforme et garde la sélection triée par id', async () => {
      await create();

      component.toggleProvider(provider(30, 'Netflix'));
      component.toggleProvider(provider(10, 'Disney+'));

      expect(ids(component.selectedProviders())).toEqual([10, 30]);
    });

    it('toggleProvider retire une plateforme déjà sélectionnée', async () => {
      await create([provider(10), provider(20)]);

      component.toggleProvider(provider(10));

      expect(ids(component.selectedProviders())).toEqual([20]);
    });

    it('removeProvider retire la plateforme demandée', async () => {
      await create([provider(10), provider(20)]);

      component.removeProvider(20);

      expect(ids(component.selectedProviders())).toEqual([10]);
    });

    it('cocher une case sélectionne la plateforme correspondante', async () => {
      await create();

      const checkboxes = await loader.getAllHarnesses(MatCheckboxHarness.with({ ancestor: '.provider-container' }));
      await checkboxes[1].check(); // 2e plateforme affichée : Disney+ (id 10)

      expect(ids(component.selectedProviders())).toEqual([10]);
      expect(await checkboxes[1].isChecked()).toBe(true);
    });
  });

  describe('tout sélectionner', () => {
    it('sélectionne toutes les plateformes, triées par id', async () => {
      await create();

      component.toggleAllProviders();

      expect(ids(component.selectedProviders())).toEqual([10, 20, 30, 40]);
      expect(component.areAllProvidersSelected()).toBe(true);
    });

    it('ne modifie pas l\'ordre de la liste affichée (le tri porte sur une copie)', async () => {
      await create();
      const before = ids(component.allProviders());

      component.toggleAllProviders();
      await fixture.whenStable();

      expect(ids(component.allProviders())).toEqual(before);
      expect(names()).toEqual(['Netflix', 'Disney+', 'Canal+', 'Apple TV+']);
    });

    it('un second appel désélectionne tout', async () => {
      await create();

      component.toggleAllProviders();
      component.toggleAllProviders();

      expect(component.selectedProviders()).toEqual([]);
      expect(component.areAllProvidersSelected()).toBe(false);
    });

    it('ne fait rien quand aucune plateforme n\'est disponible', async () => {
      movies = makeState([]);
      series = makeState([]);
      await create();

      component.toggleAllProviders();

      expect(component.selectedProviders()).toEqual([]);
    });

    it('areAllProvidersSelected est faux sans plateforme disponible', async () => {
      movies = makeState([]);
      series = makeState([]);
      await create();

      expect(component.areAllProvidersSelected()).toBe(false);
    });

    it('partiallyComplete est vrai pour une sélection partielle seulement', async () => {
      await create();
      expect(component.partiallyComplete()).toBe(false);

      component.toggleProvider(provider(10));
      expect(component.partiallyComplete()).toBe(true);

      component.toggleAllProviders(); // sélection partielle → tout sélectionner
      expect(component.partiallyComplete()).toBe(false);
    });

    it('la case « tout » est cochée quand tout est sélectionné et indéterminée si partiel', async () => {
      await create([provider(10)]);
      const [all] = await loader.getAllHarnesses(MatCheckboxHarness.with({ ancestor: '.sub-list' }));

      expect(await all.isIndeterminate()).toBe(true);

      await all.check();
      expect(await all.isChecked()).toBe(true);
      expect(ids(component.selectedProviders())).toEqual([10, 20, 30, 40]);
    });
  });

  describe('recherche', () => {
    it('filtre par nom sans tenir compte de la casse', async () => {
      await create();

      component.searchControl.setValue('NET');
      await fixture.whenStable();

      expect(names()).toEqual(['Netflix']);
    });

    it('affiche un message quand rien ne correspond', async () => {
      await create();

      component.searchControl.setValue('zzz');
      await fixture.whenStable();

      expect(names()).toEqual([]);
      expect(host().querySelector('state-message')?.textContent).toContain('Aucune plateforme trouvée');
    });

    it('cleanInput vide la recherche et réaffiche toute la liste', async () => {
      await create();
      component.searchControl.setValue('net');
      await fixture.whenStable();

      component.cleanInput();
      await fixture.whenStable();

      expect(component.searchControl.value).toBe('');
      expect(names()).toHaveLength(4);
    });

    it('la recherche ne modifie pas la sélection', async () => {
      await create([provider(10)]);

      component.searchControl.setValue('net');
      await fixture.whenStable();

      expect(ids(component.selectedProviders())).toEqual([10]);
    });
  });

  describe('fermeture de la boîte de dialogue', () => {
    it('sans sélection : libellé d\'invitation, bouton désactivé et fermeture interdite', async () => {
      await create();

      expect(component.hasSelectionProviders()).toBe(false);
      expect(component.actionsClose()).toBe('Veuillez sélectionner au moins 1 service');
      expect(dialogRef.disableClose).toBe(true);
      expect(host().querySelector<HTMLButtonElement>('.dialog-action')?.disabled).toBe(true);
    });

    it('avec une sélection : « Terminé », bouton actif et fermeture autorisée', async () => {
      await create([provider(10)]);

      expect(component.actionsClose()).toBe('Terminé');
      expect(dialogRef.disableClose).toBe(false);
      expect(host().querySelector<HTMLButtonElement>('.dialog-action')?.disabled).toBe(false);
    });

    it('autorise la fermeture dès qu\'une plateforme est cochée', async () => {
      await create();

      component.toggleProvider(provider(10));
      await fixture.whenStable();

      expect(dialogRef.disableClose).toBe(false);
    });

    it('un clic sur le fond ferme la boîte avec la sélection', async () => {
      await create([provider(10), provider(20)]);

      backdrop$.next(new MouseEvent('click'));

      expect(dialogRef.close).toHaveBeenCalledOnce();
      expect(ids(dialogRef.close.mock.calls[0][0])).toEqual([10, 20]);
    });

    it('un clic sur le fond sans sélection ne ferme pas la boîte', async () => {
      await create();

      backdrop$.next(new MouseEvent('click'));

      expect(dialogRef.close).not.toHaveBeenCalled();
    });

    it('le bouton « Terminé » renvoie la sélection', async () => {
      await create([provider(10)]);

      host().querySelector<HTMLButtonElement>('.dialog-action')?.click();

      expect(dialogRef.close).toHaveBeenCalledOnce();
      expect(ids(dialogRef.close.mock.calls[0][0])).toEqual([10]);
    });
  });

  describe('nouvelle tentative', () => {
    const fail = (state: ReturnType<typeof makeState>) => state.error.set(new Error('réseau'));

    it.each([
      ['les films seuls', true, false, 1, 0],
      ['les séries seules', false, true, 0, 1],
      ['les deux', true, true, 1, 1],
      ['aucune (rien en erreur)', false, false, 0, 0],
    ] as const)('recharge %s', async (_label, moviesFail, seriesFail, moviesCalls, seriesCalls) => {
      await create();
      if (moviesFail) fail(movies);
      if (seriesFail) fail(series);

      component.onRetry();

      expect(movies.reload).toHaveBeenCalledTimes(moviesCalls);
      expect(series.reload).toHaveBeenCalledTimes(seriesCalls);
    });

    it('ne dépend pas du type de média du service (régression : toujours « movie »)', async () => {
      await create();
      fail(series);

      component.onRetry();

      expect(series.reload).toHaveBeenCalledOnce();
    });
  });

  describe('hors connexion', () => {
    it('masque la recherche, les cases à cocher et la case « tout »', async () => {
      isOnline.set(false);
      await create([provider(10)]);

      expect(host().querySelector('input[matInput]')).toBeNull();
      expect(host().querySelectorAll('mat-checkbox')).toHaveLength(0);
    });

    it('affiche la liste et la recherche quand la connexion est disponible', async () => {
      await create();

      expect(host().querySelector('input[matInput]')).not.toBeNull();
      expect(host().querySelectorAll('.provider-container mat-checkbox')).toHaveLength(4);
    });
  });
});
