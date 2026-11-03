import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { MatTabNavPanel } from '@angular/material/tabs';
import { beforeEach, describe, expect, it } from 'vitest';
import { BreakpointService } from '@core/services/breakpoint-service';
import { TitleHeaderComponent } from './title-header';

// Hôte de test : le header exige un `tabPanel`, fourni ici comme dans app.html.
@Component({
  imports: [TitleHeaderComponent, MatTabNavPanel],
  template: `
    <title-header [tabPanel]="tabPanel" />
    <mat-tab-nav-panel #tabPanel></mat-tab-nav-panel>
  `,
})
class HostComponent {}

describe('TitleHeaderComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  const breakpoints = {
    hasSmallScreen: signal(false),
    hasXSmallScreen: signal(false),
  };

  const setScreen = (screen: 'phone' | 'tablet' | 'desktop') => {
    breakpoints.hasSmallScreen.set(screen !== 'desktop');
    breakpoints.hasXSmallScreen.set(screen === 'phone');
    fixture.detectChanges();
  };

  const el = (selector: string): HTMLElement | null => fixture.nativeElement.querySelector(selector);
  const all = (selector: string): HTMLElement[] => Array.from(fixture.nativeElement.querySelectorAll(selector));

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideRouter([]), { provide: BreakpointService, useValue: breakpoints }],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
  });

  describe('recherche', () => {
    it('téléphone : affiche le bouton de recherche, pas le champ', () => {
      setScreen('phone');

      expect(el('.search-trigger')).not.toBeNull();
      expect(el('.header__search input')).toBeNull();
    });

    it('tablette : affiche le champ dans la rangée du haut, pas le bouton', () => {
      setScreen('tablet');

      expect(el('.header__top .header__search input')).not.toBeNull();
      expect(el('.search-trigger')).toBeNull();
    });

    it('desktop : affiche le champ hors de la rangée du haut, pas le bouton', () => {
      setScreen('desktop');

      expect(el('.header__top')).toBeNull();
      expect(el('.header__search input')).not.toBeNull();
      expect(el('.search-trigger')).toBeNull();
    });

    it('ne rend jamais deux champs de recherche à la fois', () => {
      for (const screen of ['phone', 'tablet', 'desktop'] as const) {
        setScreen(screen);
        expect(all('.header__search input').length).toBeLessThanOrEqual(1);
      }
    });

    it('passe du bouton au champ quand l’écran s’élargit', () => {
      setScreen('phone');
      setScreen('tablet');

      expect(el('.search-trigger')).toBeNull();
      expect(el('.header__search input')).not.toBeNull();
    });
  });

  describe('navigation', () => {
    it('affiche les onglets sur tous les écrans', () => {
      for (const screen of ['phone', 'tablet', 'desktop'] as const) {
        setScreen(screen);
        expect(all('a[mat-tab-link]').map((a) => a.textContent?.trim())).toEqual([
          'Accueil', 'Nouveautés', 'Populaires', 'Listes',
        ]);
      }
    });

    it('désactive les onglets sans route', () => {
      setScreen('desktop');

      const disabled = all('a[mat-tab-link][aria-disabled="true"]').map((a) => a.textContent?.trim());
      expect(disabled).toEqual(['Accueil', 'Nouveautés', 'Listes']);
    });
  });
});
