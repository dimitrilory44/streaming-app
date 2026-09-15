import { Component, computed, effect, inject, input, output, signal, ViewChild } from '@angular/core';
import { MatMenu, MatMenuModule } from "@angular/material/menu";
import { MatCheckbox } from "@angular/material/checkbox";
import { MatIconModule } from "@angular/material/icon";
import { Criteria, Genre, ReleaseDate } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { MatButtonModule } from '@angular/material/button';
import { TmdbApiService } from '@core/services/tmdb-api';
import { MatSliderModule } from '@angular/material/slider';
import { AllSortOptions, ArrayElement, ArrayKeys, CriteriaItem, GenderState } from '@shared/types/collection.types';
import { makeSelectionHelpers } from '@shared/helpers/collection.helpers';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { DEFAULT_AGE_KEY, DEFAULT_COUNTRY_KEY, DEFAULT_DURATION_KEY, DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY, DEFAULT_MOVIES_AGE_KEY, DEFAULT_NOTE_KEY, DEFAULT_NOTES_KEY, DEFAULT_RELEASE_DATE, DEFAULT_RELEASE_KEY, DEFAULT_SORT, DEFAULT_TV_AGE_KEY } from '@shared/constants/preference-key';

@Component({
  selector: 'title-filter-criteria',
  imports: [MatMenuModule, MatCheckbox, MatButtonModule, MatIconModule, MatSliderModule, ReactiveFormsModule],
  templateUrl: './title-filter-criteria.html',
  styleUrl: './title-filter-criteria.scss',
})
export class TitleFilterCriteriaComponent {
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #tmdbApiService = inject(TmdbApiService);
  readonly #formBuilder = inject(FormBuilder);

  readonly resetSort = input<AllSortOptions>();
  readonly resetSortChange = output<AllSortOptions>();

  @ViewChild('monoMenu') monoMenu!: MatMenu;
  @ViewChild('combinedMenu') combinedMenu!: MatMenu;

  readonly selectedRange = signal<'thisYear' | 'lastYear' | null>(null);
  readonly currentYear = new Date().getFullYear();
  multiCriteria: CriteriaItem[] = [];

  readonly criteria: CriteriaItem[] = [
    { id: 0, key: DEFAULT_RELEASE_KEY, type: 'range' },
    { id: 1, key: DEFAULT_GENDERS_KEY, type: 'list', value: this.#tmdbApiService.allGenders },
    { id: 2, key: DEFAULT_NOTE_KEY, type: 'range' },
    { id: 3, key: DEFAULT_NOTES_KEY, type: 'list', groupKeyWith: DEFAULT_NOTE_KEY, value: signal([]) },
    { id: 4, key: DEFAULT_COUNTRY_KEY, type: 'list' },
    { id: 5, key: DEFAULT_DURATION_KEY, type: 'range' },
    { id: 6, key: DEFAULT_AGE_KEY, type: 'list' },
    { id: 7, key: DEFAULT_MOVIES_AGE_KEY, type: 'list', groupKeyWith: DEFAULT_AGE_KEY },
    { id: 8, key: DEFAULT_TV_AGE_KEY, type: 'list', groupKeyWith: DEFAULT_AGE_KEY }
  ];

  readonly filteredCriteria = computed(() => this.criteria.filter(c => !c.groupKeyWith));

  readonly genderStates = computed<Map<number, GenderState>>(() => {
    const included = this.#userPreferencesService.genreHelpers.items();
    const excluded = this.#userPreferencesService.genreExcludedHelpers.items();

    const map = new Map<number, GenderState>();
    included.forEach(g => map.set(g.id, 'includedGenders'));
    excluded.forEach(g => map.set(g.id, 'excludedGenders'));

    return map;
  });

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

  onCriteriaChange(key: keyof Criteria) {
    switch (key) {
      case DEFAULT_RELEASE_KEY: return !this.#userPreferencesService.releaseDateHelpers.isDefault();
      case DEFAULT_GENDERS_KEY: return this.#userPreferencesService.genreHelpers.hasItems() || this.#userPreferencesService.genreExcludedHelpers.hasItems();
      default: return false;
    }
  }

  onConvertKeyToLabel(key: keyof Criteria) {
    switch (key) {
      case DEFAULT_RELEASE_KEY: return 'Année de sortie';
      case DEFAULT_GENDERS_KEY: return 'Genres';
      case DEFAULT_NOTE_KEY: return 'Note';
      case DEFAULT_NOTES_KEY: return 'Nombres de notes';
      case DEFAULT_COUNTRY_KEY: return 'Pays de production';
      case DEFAULT_DURATION_KEY: return 'Durée';
      case DEFAULT_AGE_KEY: return 'Age';
      case DEFAULT_MOVIES_AGE_KEY: return 'Films';
      case DEFAULT_TV_AGE_KEY: return 'Séries';
      default: return '';
    }
  }

  isMultiMode(key: keyof Criteria): boolean {
    return this.criteria.some(item => item.groupKeyWith === key);
  }

  onGenresMenuOpened(id: number, key: keyof Criteria) {
    this.multiCriteria = this.criteria.filter(item => item.groupKeyWith === key || item.key === key);
    this.criteria[id].hasSelected = true;
  }

  onGenresMenuClosed(id: number, key: keyof Criteria) {
    this.multiCriteria = this.criteria.filter(item => item.groupKeyWith === key || item.key === key);
    this.criteria[id].hasSelected = false;
  }

  isSelectionSelected(key: keyof Criteria, idItem: number): boolean {
    switch (key) {
      case DEFAULT_GENDERS_KEY: return this.genderStates().get(idItem) === 'includedGenders'
      case DEFAULT_RELEASE_KEY:
      case DEFAULT_NOTE_KEY:
      case DEFAULT_DURATION_KEY:
        return false;
      default: return makeSelectionHelpers(key, this.#userPreferencesService.criteria).items().some(g => g.id === idItem);
    }
  }

  onCriteriaCheckboxClick(event: MouseEvent, criteria: CriteriaItem, item: Genre): void {
    if (criteria.key === DEFAULT_GENDERS_KEY) {
      event.preventDefault();
      this.cycleGender(item);
    } else {
      this.toggleItem(criteria.key as ArrayKeys<Criteria> & keyof Criteria, item);
    }
  }

  toggleItem<K extends ArrayKeys<Criteria> & keyof Criteria>(key: K, item: ArrayElement<NonNullable<Criteria[K]>>): void {
    const current = makeSelectionHelpers(key, this.#userPreferencesService.criteria).items();
    const exists = current.some(g => g.id === item.id);
    const updated = exists
      ? current.filter(g => g.id !== item.id)
      : [...current, item];
    this.#userPreferencesService.setCriteria(key, [...updated].sort((a, b) => a.id - b.id));
  }

  cycleGender(item: Genre): void {
    const state = this.genderStates().get(item.id) ?? 'none';

    switch (state) {
      case 'none':
        this.toggleItem(DEFAULT_GENDERS_KEY, item);
        break;
      case 'includedGenders':
        this.toggleItem(DEFAULT_GENDERS_KEY, item);
        this.toggleItem(DEFAULT_EXCLUDED_GENDERS_KEY, item);
        break;
      case 'excludedGenders':
        this.toggleItem(DEFAULT_EXCLUDED_GENDERS_KEY, item);
        break;
    }
  }

  reset(key: keyof Criteria) {
    switch (key) {
      case DEFAULT_GENDERS_KEY:
        this.#userPreferencesService.setCriteria(DEFAULT_GENDERS_KEY, []);
        this.#userPreferencesService.setCriteria(DEFAULT_EXCLUDED_GENDERS_KEY, []);
        return;
      default:
        this.#userPreferencesService.setCriteria(key, DEFAULT_RELEASE_DATE);
        return;
    }
  }

  resetAll() {
    this.#userPreferencesService.setAllCriteria({});
    this.resetSortChange.emit(DEFAULT_SORT);
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
