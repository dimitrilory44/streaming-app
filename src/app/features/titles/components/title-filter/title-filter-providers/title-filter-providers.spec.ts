import { Directive, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { Provider } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { SwiperDirective } from '@shared/directives/swiper.directive';
import { TitleFilterProviderConfigComponent } from './title-filter-provider-config/title-filter-provider-config';
import { TitleFilterProvidersComponent } from './title-filter-providers';

/** Swiper manipule le DOM réel : on le remplace par une directive sans effet. */
@Directive({ selector: '[appSwiper]' })
class StubSwiperDirective {
  readonly config = input<unknown>({});
}

const provider = (id: number, name = `Provider ${id}`): Provider => ({ provider_id: id, provider_name: name, logo_path: `/logo${id}.png` });

describe('TitleFilterProvidersComponent', () => {
  let fixture: ComponentFixture<TitleFilterProvidersComponent>;
  let component: TitleFilterProvidersComponent;
  let prefs: UserPreferencesService;
  let dialogResult: Provider[] | undefined;
  let open: ReturnType<typeof vi.fn>;

  const host = () => fixture.nativeElement as HTMLElement;
  const chips = () => Array.from(host().querySelectorAll('icon-chip'));

  beforeEach(async () => {
    localStorage.clear();
    dialogResult = undefined;
    open = vi.fn(() => ({ afterClosed: () => of(dialogResult) }));

    await TestBed.configureTestingModule({
      imports: [TitleFilterProvidersComponent],
      providers: [{ provide: MatDialog, useValue: { open } }],
    })
      .overrideComponent(TitleFilterProvidersComponent, {
        remove: { imports: [SwiperDirective] },
        add: { imports: [StubSwiperDirective] },
      })
      .compileComponents();

    prefs = TestBed.inject(UserPreferencesService);
    fixture = TestBed.createComponent(TitleFilterProvidersComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  describe('affichage', () => {
    it('affiche le compteur par défaut (1)', () => {
      expect(host().querySelector('.providers-panel__title')?.textContent).toContain('Mes services');
      expect(host().querySelector('.providers-panel__title'));
    });

    it('formate le compteur avec séparateur de milliers', async () => {
      fixture.componentRef.setInput('count', 1234);
      await fixture.whenStable();

      expect(host().querySelector('.providers-panel__title'));
    });

    it('n\'affiche aucune puce sans plateforme', () => {
      expect(chips()).toHaveLength(0);
    });

    it('affiche une puce par plateforme, dans l\'ordre fourni', async () => {
      fixture.componentRef.setInput('providers', [provider(8, 'Netflix'), provider(337, 'Disney+')]);
      await fixture.whenStable();

      expect(chips()).toHaveLength(2);
      const alts = chips().map(c => c.querySelector('img')?.getAttribute('alt'));
      expect(alts).toEqual(['Netflix', 'Disney+']);
    });

    it('les puces ne sont pas supprimables', async () => {
      fixture.componentRef.setInput('providers', [provider(8)]);
      await fixture.whenStable();

      expect(host().querySelector('.icon-chip__remove')).toBeNull();
    });

    it('construit l\'URL du logo via TMDB (taille w45)', async () => {
      fixture.componentRef.setInput('providers', [provider(8)]);
      await fixture.whenStable();

      expect(chips()[0].querySelector('img')?.getAttribute('src')).toBe('https://image.tmdb.org/t/p/w45/logo8.png');
    });

    it('met à jour les puces quand la liste change', async () => {
      fixture.componentRef.setInput('providers', [provider(8)]);
      await fixture.whenStable();
      expect(chips()).toHaveLength(1);

      fixture.componentRef.setInput('providers', [provider(8), provider(9), provider(10)]);
      await fixture.whenStable();
      expect(chips()).toHaveLength(3);
    });
  });

  describe('boîte de dialogue', () => {
    it('s\'ouvre au clic sur le bouton « + »', () => {
      host().querySelector<HTMLButtonElement>('.providers-panel__add')!.click();

      expect(open).toHaveBeenCalledTimes(1);
    });

    it('ouvre le composant de configuration avec les plateformes courantes', async () => {
      const providers = [provider(8), provider(337)];
      fixture.componentRef.setInput('providers', providers);
      await fixture.whenStable();

      component.openDialog();

      expect(open).toHaveBeenCalledWith(
        TitleFilterProviderConfigComponent,
        expect.objectContaining({ data: { providers }, panelClass: 'dialog-panel', width: '600px', height: '600px' }),
      );
    });

    it('enregistre la sélection renvoyée à la fermeture', () => {
      dialogResult = [provider(8), provider(15)];

      component.openDialog();

      expect(prefs.providerHelpers.items()).toEqual(dialogResult);
    });

    it('ne modifie rien si la boîte est fermée sans résultat', () => {
      prefs.setProviders([provider(8)]);
      dialogResult = undefined;

      component.openDialog();

      expect(prefs.providerHelpers.items()).toEqual([provider(8)]);
    });

    it('remplace l\'ancienne sélection par la nouvelle', () => {
      prefs.setProviders([provider(8), provider(9)]);
      dialogResult = [provider(15)];

      component.openDialog();

      expect(prefs.providerHelpers.items()).toEqual([provider(15)]);
    });
  });
});
