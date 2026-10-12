import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { Criteria, CriteriaRangeItem, ReleaseDate } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { DEFAULT_NOTES_KEY, DEFAULT_RELEASE_DATE } from '@shared/constants/preference-key';
import { isMonoCriterion } from '@shared/helpers/collection.helpers';
import { RangeKeys } from '@shared/types/collection.types';

@Component({
  selector: 'title-filter-criteria-range',
  imports: [MatCheckbox, MatButtonModule, MatIconModule, MatSliderModule, ReactiveFormsModule],
  templateUrl: './title-filter-criteria-range.html',
  styleUrl: './title-filter-criteria-range.scss',
})
export class TitleFilterCriteriaRangeComponent {
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #formBuilder = inject(FormBuilder);

  readonly criterion = input.required<CriteriaRangeItem<RangeKeys<Criteria> & keyof Criteria>>();

  readonly selectedRange = signal<'thisYear' | 'lastYear' | null>(null);
  readonly DEFAULT_RELEASE_DATE = DEFAULT_RELEASE_DATE;
  readonly isMonoCriterion = isMonoCriterion;

  readonly options = [
    {value: 1000, label: '1k+'},
    {value: 10000, label: '10k+'},
    {value: 100000, label: '100k+'},
    {value: 1000000, label: '1m+'},
  ];

  form = this.#formBuilder.group({
    release: this.#formBuilder.group({
      min: this.#formBuilder.nonNullable.control(DEFAULT_RELEASE_DATE.min),
      max: this.#formBuilder.nonNullable.control(DEFAULT_RELEASE_DATE.max)
    }),
    // TODO : form duration à terminer
    note: this.#formBuilder.nonNullable.control(0),
    duration: this.#formBuilder.nonNullable.control(0)
  });

  get note(): number {
    return this.form.controls.note.value;
  }

  get releaseDate(): ReleaseDate {
    return this.form.controls.release.getRawValue();
  }

  readonly selected = computed(() => this.#userPreferencesService.notesHelpers.items() ?? null);

  onReleaseDateChange(key: keyof Criteria) {
    this.selectedRange.set(null);
    this.#userPreferencesService.setCriteria(key, this.releaseDate);
  }

  onNoteChange(key: keyof Criteria) {
    this.#userPreferencesService.setCriteria(key, this.note);
  }

  onSelectRangePreset(key: keyof Criteria, preset: 'thisYear' | 'lastYear') {
    const newPreset = this.selectedRange() === preset ? null : preset;
    this.selectedRange.set(newPreset);
    const releaseGroup = this.form.controls.release;

    if (newPreset === 'thisYear') {
      releaseGroup.controls.min.setValue(this.DEFAULT_RELEASE_DATE.max);
      releaseGroup.controls.max.setValue(this.DEFAULT_RELEASE_DATE.max);
    } else if (newPreset === 'lastYear') {
      releaseGroup.controls.min.setValue(this.DEFAULT_RELEASE_DATE.max - 1);
      releaseGroup.controls.max.setValue(this.DEFAULT_RELEASE_DATE.max);
    } else {
      releaseGroup.controls.min.setValue(this.DEFAULT_RELEASE_DATE.min);
      releaseGroup.controls.max.setValue(this.DEFAULT_RELEASE_DATE.max);
    }

    this.#userPreferencesService.setCriteria(key, this.releaseDate);
  }

  loadSelectedRange() {
    const startYear = this.#userPreferencesService.releaseDateHelpers.items().min;
    if (startYear === this.DEFAULT_RELEASE_DATE.max) {
      this.selectedRange.set('thisYear');
    } else if (startYear === this.DEFAULT_RELEASE_DATE.max - 1) {
      this.selectedRange.set('lastYear');
    } else {
      this.selectedRange.set(null);
    }
  }

  onSelectList(value: number) {
    const next = this.selected() === value ? 0 : value;  
    this.#userPreferencesService.setCriteria(DEFAULT_NOTES_KEY, next);
  }

  constructor() {
    effect(() => {
      this.loadSelectedRange();
      const dates = this.#userPreferencesService.releaseDateHelpers.isDefault()
        ? DEFAULT_RELEASE_DATE
        : this.#userPreferencesService.releaseDateHelpers.items();
      const note = this.#userPreferencesService.noteHelpers.isDefault()
        ? 0
        : this.#userPreferencesService.noteHelpers.items();
      this.form.controls.release.patchValue(dates, { emitEvent: false });
      this.form.controls.note.patchValue(note, { emitEvent: false });
    });
  }

}
