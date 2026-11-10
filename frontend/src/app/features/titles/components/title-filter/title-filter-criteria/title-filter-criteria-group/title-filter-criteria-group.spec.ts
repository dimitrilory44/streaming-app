import { Component, input } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { beforeEach, describe, expect, it } from 'vitest';

import * as PREF from '@shared/constants/filter-preferences';
import { CriteriaItem } from '@shared/types/collection.types';
import { TitleFilterCriteriaListComponent } from '../title-filter-criteria-list/title-filter-criteria-list';
import { TitleFilterCriteriaRangeComponent } from '../title-filter-criteria-range/title-filter-criteria-range';
import { TitleFilterCriteriaGroupComponent } from './title-filter-criteria-group';

/** Doubles des enfants : on vérifie ici l'aiguillage et les en-têtes, pas le rendu des listes / curseurs. */
@Component({ selector: 'title-filter-criteria-list', template: '' })
class StubListComponent {
  readonly criterion = input.required<CriteriaItem>();
}

@Component({ selector: 'title-filter-criteria-range', template: '' })
class StubRangeComponent {
  readonly criterion = input.required<CriteriaItem>();
}

const range = (key: 'release' | 'note' | 'notes' | 'duration') => ({ key, type: 'range' }) as CriteriaItem;
const list = (key: 'genders' | 'country' | 'moviesAge' | 'seriesAge') => ({ key, type: 'list' }) as CriteriaItem;

describe('TitleFilterCriteriaGroupComponent', () => {
  let fixture: ComponentFixture<TitleFilterCriteriaGroupComponent>;
  let component: TitleFilterCriteriaGroupComponent;
  let emitted: CriteriaItem['key'][];

  const host = () => fixture.nativeElement as HTMLElement;
  const boxes = () => Array.from(host().querySelectorAll<HTMLElement>('.criteria-panel__box'));
  const titles = () => Array.from(host().querySelectorAll('.criteria-panel__title')).map(t => t.textContent?.trim());
  const resetButtons = () => Array.from(host().querySelectorAll<HTMLButtonElement>('.criteria-panel__reset'));

  const render = async (title: string, criteria: CriteriaItem[]) => {
    fixture.componentRef.setInput('title', title);
    fixture.componentRef.setInput('criteria', criteria);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [TitleFilterCriteriaGroupComponent] })
      .overrideComponent(TitleFilterCriteriaGroupComponent, {
        remove: { imports: [TitleFilterCriteriaRangeComponent, TitleFilterCriteriaListComponent] },
        add: { imports: [StubRangeComponent, StubListComponent] },
      })
      .compileComponents();

    fixture = TestBed.createComponent(TitleFilterCriteriaGroupComponent);
    component = fixture.componentInstance;
    emitted = [];
    component.resetRequested.subscribe(key => emitted.push(key));
  });

  describe('isMultiCriteria', () => {
    it('est faux avec un seul critère', async () => {
      await render('Genres', [list('genders')]);

      expect(component.isMultiCriteria()).toBe(false);
    });

    it('est vrai avec plusieurs critères', async () => {
      await render('Note', [range('note'), range('notes')]);

      expect(component.isMultiCriteria()).toBe(true);
    });
  });

  describe('en-têtes', () => {
    it('un critère unique affiche le titre fourni', async () => {
      await render('Genres', [list('genders')]);

      expect(titles()).toEqual(['Genres']);
    });

    it('plusieurs critères affichent le libellé propre à chaque clé', async () => {
      await render('Note', [range('note'), range('notes')]);

      expect(titles()).toEqual(['Note', 'Nombre de notes']);
    });

    it('le groupe des âges affiche « Films » et « Séries »', async () => {
      await render('Âge', [list('moviesAge'), list('seriesAge')]);

      expect(titles()).toEqual(['Films', 'Séries']);
    });

    it('un critère unique ignore son libellé de clé au profit du titre', async () => {
      await render('Titre personnalisé', [range('duration')]);

      expect(titles()).toEqual(['Titre personnalisé']);
    });
  });

  describe('aiguillage list / range', () => {
    it('un critère de type list utilise le composant de liste', async () => {
      await render('Pays', [list('country')]);

      expect(fixture.debugElement.queryAll(By.directive(StubListComponent))).toHaveLength(1);
      expect(fixture.debugElement.queryAll(By.directive(StubRangeComponent))).toHaveLength(0);
    });

    it('un critère de type range utilise le composant de plage', async () => {
      await render('Durée', [range('duration')]);

      expect(fixture.debugElement.queryAll(By.directive(StubRangeComponent))).toHaveLength(1);
      expect(fixture.debugElement.queryAll(By.directive(StubListComponent))).toHaveLength(0);
    });

    it('transmet chaque critère à son composant enfant', async () => {
      const note = range('note');
      const notes = range('notes');
      await render('Note', [note, notes]);

      const children = fixture.debugElement.queryAll(By.directive(StubRangeComponent))
        .map(d => (d.componentInstance as StubRangeComponent).criterion());
      expect(children).toEqual([note, notes]);
    });

    it('rend un bloc par critère', async () => {
      await render('Note', [range('note'), range('notes')]);

      expect(boxes()).toHaveLength(2);
    });

    it('un groupe vide ne rend rien', async () => {
      await render('Vide', []);

      expect(boxes()).toHaveLength(0);
    });
  });

  describe('bouton « Réinitialiser »', () => {
    it('émet la clé du critère', async () => {
      await render('Genres', [list('genders')]);

      resetButtons()[0].click();

      expect(emitted).toEqual([PREF.DEFAULT_GENDERS_KEY]);
    });

    it('chaque critère d\'un groupe multiple émet sa propre clé', async () => {
      await render('Note', [range('note'), range('notes')]);

      resetButtons()[1].click();
      resetButtons()[0].click();

      expect(emitted).toEqual([PREF.DEFAULT_NOTES_KEY, PREF.DEFAULT_NOTE_KEY]);
    });

    it('n\'est pas affiché pour la liste « Séries » (le reset des âges est commun)', async () => {
      await render('Âge', [list('moviesAge'), list('seriesAge')]);

      expect(resetButtons()).toHaveLength(1);
      resetButtons()[0].click();
      expect(emitted).toEqual([PREF.DEFAULT_MOVIES_AGE_KEY]);
    });
  });
});
