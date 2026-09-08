import { computed, effect, Injectable, signal } from '@angular/core';
import { Criteria, Provider, UserPreferences } from '@core/models/media-model';
import { makeRangeHelpers, makeSelectionHelpers } from '@shared/helpers/collection.helpers';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  readonly STORAGE_KEY = 'data';
  readonly DEFAULT_SORT = 'popularity.desc';

  readonly defaultReleaseDate = { startYear: 1900, endYear: new Date().getFullYear() };
  readonly defaultPreferences: UserPreferences = {
    selectedSort: this.DEFAULT_SORT
  };

  readonly selectedData = signal<UserPreferences>(this.#loadFromStorage());

  readonly selectedProviders = computed(() => this.selectedData().selectedProviders ?? []);
  readonly selectedCountProviders = computed(() => this.selectedProviders().length ?? 0);

  readonly selectedCriteria = computed(() => this.selectedData().selectedCriteria);

  readonly genreHelpers = makeSelectionHelpers('genders', this.selectedCriteria);
  readonly releaseDateHelpers = makeRangeHelpers('release', this.selectedCriteria, this.defaultReleaseDate, (a, b) => a.startYear === b.startYear && a.endYear === b.endYear);

  readonly selectedSort = computed(() => this.selectedData().selectedSort);

  #loadFromStorage(): UserPreferences {
    const raw = localStorage.getItem(this.STORAGE_KEY);
    try {
      return raw 
        ? {...this.defaultPreferences, ...JSON.parse(raw) as UserPreferences }
        : {...this.defaultPreferences };
    } catch (error) {
      console.error(error);
      localStorage.removeItem(this.STORAGE_KEY);
      return { ...this.defaultPreferences };
    }
  }

  setSelectedProviders(providers: Provider[]): void {
    this.selectedData.update(current => ({...current, selectedProviders: providers}));
  }

  setSelectedSort(sort: string): void {
    this.selectedData.update(current => ({...current, selectedSort: sort}));
  }

  setCriteria<K extends keyof Criteria>(key: K, value: Criteria[K]) {
    this.selectedData.update(current => ({...current, selectedCriteria: { ...current.selectedCriteria, [key]: value }}))
  }

  setAllCriteria(criteria: Criteria) {
    this.selectedData.update(current => ({...current, selectedCriteria: criteria}));
  }

  constructor() {
    effect(() => {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.selectedData()));
    });
  }

}
