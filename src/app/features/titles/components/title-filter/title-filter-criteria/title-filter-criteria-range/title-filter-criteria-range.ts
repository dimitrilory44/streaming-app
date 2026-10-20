import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { Criteria, CriteriaRangeItem, Duration, ReleaseDate } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { DEFAULT_DURATION, DEFAULT_NOTE, DEFAULT_NOTES_KEY, DEFAULT_RELEASE_DATE, DURATION_PRESETS } from '@shared/constants/filter-preferences';
import { OPTIONS_DURATION, OPTIONS_NOTES } from '@shared/constants/sort-options';
import { DurationPreset, RangeKeys } from '@shared/types/collection.types';

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
  readonly selectedDuration = signal<DurationPreset | null>(null);
  
  readonly DEFAULT_RELEASE_DATE = DEFAULT_RELEASE_DATE;
  readonly DEFAULT_NOTES_OPTIONS = OPTIONS_NOTES;
  
  readonly DEFAULT_DURATION = DEFAULT_DURATION;
  readonly DEFAULT_DURATION_OPTIONS = OPTIONS_DURATION;

  form = this.#formBuilder.group({
    release: this.#formBuilder.group({
      min: this.#formBuilder.nonNullable.control(DEFAULT_RELEASE_DATE.min),
      max: this.#formBuilder.nonNullable.control(DEFAULT_RELEASE_DATE.max)
    }),
    note: this.#formBuilder.nonNullable.control(DEFAULT_NOTE),
    duration: this.#formBuilder.group({
      min: this.#formBuilder.nonNullable.control(DEFAULT_DURATION.min),
      max: this.#formBuilder.nonNullable.control(DEFAULT_DURATION.max)
    })
  });

  get note(): number {
    return this.form.controls.note.value;
  }

  get releaseDate(): ReleaseDate {
    return this.form.controls.release.getRawValue();
  }

  get durationRange(): Duration {
    return this.form.controls.duration.getRawValue();
  }

  readonly selectedNotes = computed(() => this.#userPreferencesService.notesHelpers.items());

  onReleaseDateChange(key: keyof Criteria) {
    this.selectedRange.set(null);
    this.#userPreferencesService.setCriteria(key, this.releaseDate);
  }

  onDurationChange(key: keyof Criteria) {
    this.selectedDuration.set(null);
    this.#userPreferencesService.setCriteria(key, this.durationRange);
  }

  onNoteChange(key: keyof Criteria) {
    this.#userPreferencesService.setCriteria(key, this.note);
  }

  onSelectDurationChange(key: keyof Criteria, preset: DurationPreset) {
    const newPreset = this.selectedDuration() === preset ? null : preset;
    this.selectedDuration.set(newPreset);

    const range = newPreset ? DURATION_PRESETS[newPreset] : DEFAULT_DURATION;
    this.form.controls.duration.patchValue(range);

    this.#userPreferencesService.setCriteria(key, this.durationRange);
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

  loadSelectedDuration() {
    const { min, max } = this.#userPreferencesService.durationHelpers.items();

    const match = (Object.keys(DURATION_PRESETS) as DurationPreset[]).find(
      (p) => DURATION_PRESETS[p].min === min && DURATION_PRESETS[p].max === max
    );

    this.selectedDuration.set(match ?? null);
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
    const next = this.selectedNotes() === value ? 0 : value;
    this.#userPreferencesService.setCriteria(DEFAULT_NOTES_KEY, next);
  }

  constructor() {
    effect(() => {
      this.loadSelectedRange();
      this.loadSelectedDuration();
      const dates = this.#userPreferencesService.releaseDateHelpers.isDefault()
        ? DEFAULT_RELEASE_DATE
        : this.#userPreferencesService.releaseDateHelpers.items();
      const note = this.#userPreferencesService.noteHelpers.isDefault()
        ? 0
        : this.#userPreferencesService.noteHelpers.items();
      const duration = this.#userPreferencesService.durationHelpers.isDefault()
        ? DEFAULT_DURATION
        : this.#userPreferencesService.durationHelpers.items();
      this.form.controls.release.patchValue(dates, { emitEvent: false });
      this.form.controls.note.patchValue(note, { emitEvent: false });
      this.form.controls.duration.patchValue(duration, { emitEvent: false });
    });
  }

}
