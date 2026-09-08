import { Component, computed, effect, inject, linkedSignal, model, signal, ViewChild } from '@angular/core';
import { MatMenu, MatMenuModule } from "@angular/material/menu";
import { MatCheckbox } from "@angular/material/checkbox";
import { MatIconModule } from "@angular/material/icon";
import { Criteria, Genre, ReleaseDate } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { MatButtonModule } from '@angular/material/button';
import { TmdbApiService } from '@core/services/tmdb-api';
import { MatSliderModule } from '@angular/material/slider';
import { AllSortOptions, ArrayElement, ArrayKeys, CriteriaItem } from '@shared/types/collection.types';
import { makeSelectionHelpers } from '@shared/helpers/collection.helpers';
import { FormArray, FormBuilder, FormGroup, ReactiveFormsModule } from '@angular/forms';

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

  @ViewChild('monoMenu') monoMenu!: MatMenu;
  @ViewChild('combinedMenu') combinedMenu!: MatMenu;

  readonly resetSort = model<AllSortOptions>('popularity.desc');

  readonly selectedRange = signal<'thisYear' | 'lastYear' | null>(null);
  readonly currentYear = new Date().getFullYear();
  multiCriteria: CriteriaItem[] = [];

  readonly criteria: CriteriaItem[] = [
    { id: 0, key: 'release', type: 'range', hasSelected: false },
    { id: 1, key: 'genders', type: 'list', hasSelected: false, value: signal(this.#tmdbApiService.allGenders()) },
    { id: 2, key: 'note', type: 'range', hasSelected: false },
    { id: 3, key: 'notes', type: 'list', groupKeyWith: 'note' },
    { id: 4, key: 'country', type: 'list', value: signal([]) },
    { id: 5, key: 'duration', type: 'range' },
    { id: 6, key: 'age', type: 'list', value: signal([]) },
    { id: 7, key: 'moviesAge', type: 'list', groupKeyWith: 'age', value: signal([]) },
    { id: 8, key: 'seriesAge', type: 'list', groupKeyWith: 'age', value: signal([])}
  ];

  readonly filteredCriteria = computed(() => this.criteria.filter(c => !c.groupKeyWith));

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

  onCriteriaChange(key: string) {
    switch (key) {
      case 'release': return !this.#userPreferencesService.releaseDateHelpers.isDefault();
      case 'genders': return this.#userPreferencesService.genreHelpers.hasItems();
      default: return false;
    }
  }

  onConvertKeyToLabel(key: string) {
    switch (key) {
      case 'release': return 'Année de sortie';
      case 'genders': return 'Genres';
      case 'note': return 'Note';
      case 'notes': return 'Nombres de notes';
      case 'country': return 'Pays de production';
      case 'duration': return 'Durée';
      case 'age': return 'Age'
      case 'moviesAge': return 'Films';
      case 'seriesAge': return 'Séries'
      default: return '';
    }
  }

  isMultiMode(key: string): boolean {
    return this.criteria.some(item => item.groupKeyWith === key);
  }

  onGenresMenuOpened(id: number, key: string) {
    this.multiCriteria = this.criteria.filter(item => item.groupKeyWith === key || item.key === key);
    this.criteria[id].hasSelected = true;
  }

  onGenresMenuClosed(id: number, key: string) {
    this.multiCriteria = this.criteria.filter(item => item.groupKeyWith === key || item.key === key);
    this.criteria[id].hasSelected = false;
  }

  isSelectionSelected(key: string, idItem: number): boolean {
    switch (key) {
      case 'genders': return linkedSignal<Genre[]>(() => this.#userPreferencesService.genreHelpers.items())().some(g => g.id === idItem);
      default: return false;
    }
  }

  toggleItem<K extends ArrayKeys<Criteria> & keyof Criteria>(key: K, item: ArrayElement<NonNullable<Criteria[K]>>): void {
    const current = linkedSignal<NonNullable<Criteria[K]>>(() => makeSelectionHelpers(key, this.#userPreferencesService.selectedCriteria).items());
    const exists = current().some(g => g.id === item.id);
    const updated = exists
      ? current().filter(g => g.id !== item.id)
      : [...current(), item];
    current.set(updated.sort((a, b) => a.id - b.id));
    this.#userPreferencesService.setCriteria(key, current());
  }

  reset(key: keyof Criteria) {
    this.#userPreferencesService.setCriteria(key, { startYear: 1900, endYear: new Date().getFullYear() } as ReleaseDate);
  }

  resetAll() {
    this.#userPreferencesService.setAllCriteria({});
    this.#userPreferencesService.setSelectedSort('popularity.desc');
    this.resetSort.set('popularity.desc');
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
    // TOFIX : problème de synchro avec les valeurs de mat-slider (warning)
    effect(() => {
      this.loadSelectedRange();
      if (this.#userPreferencesService.releaseDateHelpers.isDefault()) {
        this.releaseDates.clear();
        this.addReleaseDate({ startYear: 1900, endYear: new Date().getFullYear() });
      } else {
        this.releaseDates.clear();
        this.addReleaseDate(this.#userPreferencesService.releaseDateHelpers.items());
      }
    });
  }

}
