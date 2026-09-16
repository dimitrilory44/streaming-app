import { Component, effect, inject, input, signal } from '@angular/core';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatSliderModule } from '@angular/material/slider';
import { Criteria, CriteriaRangeItem, ReleaseDate } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { DEFAULT_RELEASE_DATE } from '@shared/constants/preference-key';
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
  readonly currentYear = new Date().getFullYear();
  
  form = this.#formBuilder.group({
    releaseDates: this.#formBuilder.array<FormGroup>([])
  });

  get releaseDates(): FormArray {
    return this.form.get('releaseDates') as FormArray;
  }

  #createReleaseDateGroup(value: ReleaseDate): FormGroup {
    return this.#formBuilder.group({
      startYear: value.startYear,
      endYear: value.endYear
    });
  }

  getSelectedReleaseDates(): ReleaseDate[] {
    return this.releaseDates.value;
  }

  onReleaseDateChange(key: keyof Criteria, event: Event, index: number) {
    this.selectedRange.set(null);
    const target = event.target as HTMLInputElement;
    const value = parseInt(target.value, 10);
    const releaseDateGroup = this.releaseDates.at(index) as FormGroup;

    if (target.getAttribute('formControlName') === 'startYear') {
      releaseDateGroup.get('startYear')?.setValue(value);
    } else if (target.getAttribute('formControlName') === 'endYear') {
      releaseDateGroup.get('endYear')?.setValue(value);
    }
    const updated: ReleaseDate = {
      startYear: releaseDateGroup.get('startYear')?.value,
      endYear: releaseDateGroup.get('endYear')?.value
    };
    this.#userPreferencesService.setCriteria(key, updated);
  }

  onSelectRangePreset(key: keyof Criteria, index: number, preset: 'thisYear' | 'lastYear' | null) {
    this.selectedRange.set(preset);
    const releaseDateGroup = this.releaseDates.at(index) as FormGroup;

    if (preset === 'thisYear') {
      releaseDateGroup.get('startYear')?.setValue(this.currentYear);
      releaseDateGroup.get('endYear')?.setValue(this.currentYear);
    } else if (preset === 'lastYear') {
      releaseDateGroup.get('startYear')?.setValue(this.currentYear - 1);
      releaseDateGroup.get('endYear')?.setValue(this.currentYear);
    }
    const updated: ReleaseDate = {
      startYear: releaseDateGroup.get('startYear')?.value,
      endYear: releaseDateGroup.get('endYear')?.value
    };
    this.#userPreferencesService.setCriteria(key, updated);
  }

  addReleaseDate(value: ReleaseDate): void {
    this.releaseDates.push(this.#createReleaseDateGroup(value));
  }

  loadSelectedRange() {
    const startYear = this.#userPreferencesService.releaseDateHelpers.items().startYear;
    if (startYear === this.currentYear) {
      this.selectedRange.set('thisYear');
    } else if (startYear === this.currentYear - 1) {
      this.selectedRange.set('lastYear');
    } else {
      this.selectedRange.set(null);
    }
  }

  constructor() {
    effect(() => {
      this.loadSelectedRange();
      const dates = this.#userPreferencesService.releaseDateHelpers.isDefault()
        ? DEFAULT_RELEASE_DATE
        : this.#userPreferencesService.releaseDateHelpers.items();

      if (this.releaseDates.length === 0) {
        this.addReleaseDate(dates);
      } else {
        this.releaseDates.at(0).patchValue(dates, { emitEvent: false });
      }
    });
  }

}
