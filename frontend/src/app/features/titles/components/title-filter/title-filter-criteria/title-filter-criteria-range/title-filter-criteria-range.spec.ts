import { ComponentFixture, TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';

import { Criteria, CriteriaRangeItem } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';
import { OPTIONS_DURATION, OPTIONS_NOTES } from '@shared/constants/sort-options';
import { RangeKeys } from '@shared/types/collection.types';
import { TitleFilterCriteriaRangeComponent } from './title-filter-criteria-range';

type RangeCriterion = CriteriaRangeItem<RangeKeys<Criteria> & keyof Criteria>;

const THIS_YEAR = PREF.DEFAULT_RELEASE_DATE.max;

describe('TitleFilterCriteriaRangeComponent', () => {
  let fixture: ComponentFixture<TitleFilterCriteriaRangeComponent>;
  let component: TitleFilterCriteriaRangeComponent;
  let prefs: UserPreferencesService;

  const host = () => fixture.nativeElement as HTMLElement;
  const checkboxes = () => Array.from(host().querySelectorAll<HTMLElement>('mat-checkbox'));
  const labels = () => checkboxes().map(c => c.textContent?.trim());
  const isChecked = (el: HTMLElement) => el.querySelector<HTMLInputElement>('input')!.checked;

  const render = async (key: RangeCriterion['key']) => {
    fixture.componentRef.setInput('criterion', { key, type: 'range' } as RangeCriterion);
    await fixture.whenStable();
  };

  beforeEach(async () => {
    localStorage.clear();

    await TestBed.configureTestingModule({ imports: [TitleFilterCriteriaRangeComponent] }).compileComponents();

    prefs = TestBed.inject(UserPreferencesService);
    fixture = TestBed.createComponent(TitleFilterCriteriaRangeComponent);
    component = fixture.componentInstance;
  });

  describe('valeurs initiales du formulaire', () => {
    it('reprend les valeurs par défaut quand aucun filtre n\'est actif', async () => {
      await render('release');

      expect(component.releaseDate).toEqual(PREF.DEFAULT_RELEASE_DATE);
      expect(component.note).toBe(0);
      expect(component.durationRange).toEqual(PREF.DEFAULT_DURATION);
      expect(component.selectedRange()).toBeNull();
      expect(component.selectedDuration()).toBeNull();
    });

    it('reprend les préférences enregistrées', async () => {
      prefs.setAllCriteria({ release: { min: 1990, max: 2000 }, note: 7, duration: { min: 1, max: 2 } });
      await render('release');

      expect(component.releaseDate).toEqual({ min: 1990, max: 2000 });
      expect(component.note).toBe(7);
      expect(component.durationRange).toEqual({ min: 1, max: 2 });
    });

    it('se resynchronise quand les préférences changent ailleurs (ex. « Réinitialiser »)', async () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 8);
      await render('note');
      expect(component.note).toBe(8);

      prefs.setAllCriteria({});
      await fixture.whenStable();

      expect(component.note).toBe(0);
    });
  });

  describe('année de sortie', () => {
    it('onReleaseDateChange enregistre la plage du formulaire', async () => {
      await render('release');
      component.form.controls.release.setValue({ min: 1980, max: 1999 });

      component.onReleaseDateChange(PREF.DEFAULT_RELEASE_KEY);

      expect(prefs.releaseDateHelpers.items()).toEqual({ min: 1980, max: 1999 });
    });

    it('onReleaseDateChange désélectionne le preset en cours', async () => {
      await render('release');
      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'thisYear');
      expect(component.selectedRange()).toBe('thisYear');

      component.onReleaseDateChange(PREF.DEFAULT_RELEASE_KEY);

      expect(component.selectedRange()).toBeNull();
    });

    it('preset « Cette année » : de l\'année courante à l\'année courante', async () => {
      await render('release');

      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'thisYear');

      expect(prefs.releaseDateHelpers.items()).toEqual({ min: THIS_YEAR, max: THIS_YEAR });
      expect(component.selectedRange()).toBe('thisYear');
    });

    it('preset « Année dernière » : de l\'année précédente à l\'année courante', async () => {
      await render('release');

      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'lastYear');

      expect(prefs.releaseDateHelpers.items()).toEqual({ min: THIS_YEAR - 1, max: THIS_YEAR });
      expect(component.selectedRange()).toBe('lastYear');
    });

    it('re-cliquer sur le même preset le désactive et revient à la plage par défaut', async () => {
      await render('release');
      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'thisYear');

      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'thisYear');

      expect(component.selectedRange()).toBeNull();
      expect(prefs.releaseDateHelpers.isDefault()).toBe(true);
    });

    it('changer de preset remplace le précédent', async () => {
      await render('release');
      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'thisYear');

      component.onSelectRangePreset(PREF.DEFAULT_RELEASE_KEY, 'lastYear');

      expect(component.selectedRange()).toBe('lastYear');
    });

    it('loadSelectedRange déduit le preset depuis les préférences', async () => {
      await render('release');

      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: THIS_YEAR, max: THIS_YEAR });
      component.loadSelectedRange();
      expect(component.selectedRange()).toBe('thisYear');

      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: THIS_YEAR - 1, max: THIS_YEAR });
      component.loadSelectedRange();
      expect(component.selectedRange()).toBe('lastYear');

      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: 1990, max: THIS_YEAR });
      component.loadSelectedRange();
      expect(component.selectedRange()).toBeNull();
    });

    it('affiche les deux presets et coche celui qui correspond aux préférences', async () => {
      prefs.setCriteria(PREF.DEFAULT_RELEASE_KEY, { min: THIS_YEAR - 1, max: THIS_YEAR });
      await render('release');

      expect(labels()).toEqual(['Cette année', 'Année dernière']);
      expect(checkboxes().map(isChecked)).toEqual([false, true]);
    });

    it('un clic sur un preset met à jour les préférences', async () => {
      await render('release');

      checkboxes()[0].querySelector<HTMLInputElement>('input')!.click();
      await fixture.whenStable();

      expect(prefs.releaseDateHelpers.items()).toEqual({ min: THIS_YEAR, max: THIS_YEAR });
    });
  });

  describe('note', () => {
    it('onNoteChange enregistre la note du formulaire', async () => {
      await render('note');
      component.form.controls.note.setValue(6);

      component.onNoteChange(PREF.DEFAULT_NOTE_KEY);

      expect(prefs.noteHelpers.items()).toBe(6);
    });

    it('affiche le curseur sans options à cocher', async () => {
      await render('note');

      expect(host().querySelector('mat-slider')).not.toBeNull();
      expect(checkboxes()).toHaveLength(0);
    });
  });

  describe('nombre de notes', () => {
    it('affiche les options de OPTIONS_NOTES', async () => {
      await render('notes');

      expect(labels()).toEqual(OPTIONS_NOTES.map(o => o.label));
    });

    it('sélectionner une option enregistre sa valeur', async () => {
      await render('notes');

      component.onSelectList(10000);

      expect(prefs.notesHelpers.items()).toBe(10000);
      expect(component.selectedNotes()).toBe(10000);
    });

    it('re-sélectionner la même option remet 0', async () => {
      await render('notes');
      component.onSelectList(10000);

      component.onSelectList(10000);

      expect(prefs.notesHelpers.items()).toBe(0);
    });

    it('choisir une autre option remplace la précédente', async () => {
      await render('notes');
      component.onSelectList(1000);

      component.onSelectList(100000);

      expect(prefs.notesHelpers.items()).toBe(100000);
    });

    it('coche l\'option correspondant aux préférences', async () => {
      prefs.setCriteria(PREF.DEFAULT_NOTES_KEY, 100000);
      await render('notes');

      expect(checkboxes().map(isChecked)).toEqual([false, false, true, false]);
    });

    it('un clic sur une option met à jour les préférences', async () => {
      await render('notes');

      checkboxes()[1].querySelector<HTMLInputElement>('input')!.click();
      await fixture.whenStable();

      expect(prefs.notesHelpers.items()).toBe(10000);
    });

    it('ne touche pas à la note moyenne', async () => {
      prefs.setCriteria(PREF.DEFAULT_NOTE_KEY, 7);
      await render('notes');

      component.onSelectList(1000);

      expect(prefs.noteHelpers.items()).toBe(7);
    });
  });

  describe('durée', () => {
    it('onDurationChange enregistre la plage du formulaire et désélectionne le preset', async () => {
      await render('duration');
      component.onSelectDurationChange(PREF.DEFAULT_DURATION_KEY, '1h');
      component.form.controls.duration.setValue({ min: 1, max: 2 });

      component.onDurationChange(PREF.DEFAULT_DURATION_KEY);

      expect(prefs.durationHelpers.items()).toEqual({ min: 1, max: 2 });
      expect(component.selectedDuration()).toBeNull();
    });

    it.each(Object.entries(PREF.DURATION_PRESETS))('preset %s enregistre sa plage', async (preset, range) => {
      await render('duration');

      component.onSelectDurationChange(PREF.DEFAULT_DURATION_KEY, preset as keyof typeof PREF.DURATION_PRESETS);

      expect(prefs.durationHelpers.items()).toEqual(range);
      expect(component.selectedDuration()).toBe(preset);
    });

    it('re-cliquer sur le même preset le désactive et remet la durée par défaut', async () => {
      await render('duration');
      component.onSelectDurationChange(PREF.DEFAULT_DURATION_KEY, '2h');

      component.onSelectDurationChange(PREF.DEFAULT_DURATION_KEY, '2h');

      expect(component.selectedDuration()).toBeNull();
      expect(prefs.durationHelpers.isDefault()).toBe(true);
    });

    it('loadSelectedDuration retrouve le preset depuis les préférences', async () => {
      await render('duration');

      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, PREF.DURATION_PRESETS['1.5h']);
      component.loadSelectedDuration();
      expect(component.selectedDuration()).toBe('1.5h');

      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, { min: 0.3, max: 1.2 });
      component.loadSelectedDuration();
      expect(component.selectedDuration()).toBeNull();
    });

    it('les presets couvrent toute la plage sans trou entre deux voisins', () => {
      const ranges = OPTIONS_DURATION.map(o => PREF.DURATION_PRESETS[o.label as keyof typeof PREF.DURATION_PRESETS]);

      for (let i = 1; i < ranges.length; i++) {
        expect(ranges[i].min).toBe(ranges[i - 1].max);
      }
      expect(ranges[0].min).toBe(PREF.DEFAULT_DURATION.min);
      expect(ranges.at(-1)!.max).toBe(PREF.DEFAULT_DURATION.max);
    });

    it('affiche un checkbox par option de OPTIONS_DURATION', async () => {
      await render('duration');

      expect(labels()).toEqual(OPTIONS_DURATION.map(o => o.label));
    });

    it('coche l\'option qui correspond aux préférences', async () => {
      prefs.setCriteria(PREF.DEFAULT_DURATION_KEY, PREF.DURATION_PRESETS['1h']);
      await render('duration');

      const index = OPTIONS_DURATION.findIndex(o => o.label === '1h');
      expect(checkboxes().map(isChecked)).toEqual(OPTIONS_DURATION.map((_, i) => i === index));
    });

    it('un clic sur une option met à jour les préférences', async () => {
      await render('duration');

      checkboxes()[2].querySelector<HTMLInputElement>('input')!.click();
      await fixture.whenStable();

      expect(prefs.durationHelpers.items()).toEqual(PREF.DURATION_PRESETS[OPTIONS_DURATION[2].label as keyof typeof PREF.DURATION_PRESETS]);
    });
  });
});
