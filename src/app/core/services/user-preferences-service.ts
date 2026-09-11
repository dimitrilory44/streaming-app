import { computed, effect, Injectable, signal } from '@angular/core';
import { Criteria, Provider, UserPreferences } from '@core/models/media-model';
import { makeRangeHelpers, makeSelectionHelpers, makeSortHelpers } from '@shared/helpers/collection.helpers';
import { MediaType } from '@shared/types/collection.types';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  readonly STORAGE_KEY = 'data';
  readonly DEFAULT_SORT = 'popularity.desc';
  readonly DEFAULT_MEDIA = 'movie';

  readonly defaultReleaseDate = { startYear: 1900, endYear: new Date().getFullYear() };
  readonly defaultPreferences: UserPreferences = {
    sortByMedia: {
      movie: this.DEFAULT_SORT,
      tv: this.DEFAULT_SORT,
      all: this.DEFAULT_SORT
    }
  };

  readonly selectedData = signal<UserPreferences>(this.#loadFromStorage());

  readonly providerHelpers = makeSelectionHelpers('selectedProviders', this.selectedData);

  readonly selectedCriteria = computed(() => this.selectedData().selectedCriteria);
  
  readonly sortHelpers: Record<MediaType, ReturnType<typeof makeSortHelpers>> = {
      movie: makeSortHelpers('movie', this.selectedData, this.DEFAULT_SORT),
      tv: makeSortHelpers('tv', this.selectedData, this.DEFAULT_SORT),
      all: makeSortHelpers('all', this.selectedData, this.DEFAULT_SORT)
  };

  readonly genreHelpers = makeSelectionHelpers('genders', this.selectedCriteria);
  readonly releaseDateHelpers = makeRangeHelpers('release', this.selectedCriteria, this.defaultReleaseDate, (a, b) => a.startYear === b.startYear && a.endYear === b.endYear);

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
