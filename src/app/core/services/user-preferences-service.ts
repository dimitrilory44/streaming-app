import { computed, effect, Injectable, signal } from '@angular/core';
import { Criteria, Provider, UserPreferences } from '@core/models/media-model';
import { DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY, DEFAULT_PROVIDERS_KEY, DEFAULT_RELEASE_DATE, DEFAULT_RELEASE_KEY, DEFAULT_SORT, DEFAULT_SORT_MEDIA, DEFAULT_STORAGE_KEY } from '@shared/constants/preference-key';
import { makeRangeHelpers, makeSelectionHelpers, makeSortHelpers } from '@shared/helpers/collection.helpers';
import { MediaType } from '@shared/types/collection.types';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  readonly data = signal<UserPreferences>(this.#loadFromStorage());
  readonly criteria = computed(() => this.data().criteria);
  
  readonly providerHelpers = makeSelectionHelpers(DEFAULT_PROVIDERS_KEY, this.data);
  readonly sortHelpers: Record<MediaType, ReturnType<typeof makeSortHelpers>> = {
    movie: makeSortHelpers('movie', this.data, DEFAULT_SORT),
    tv: makeSortHelpers('tv', this.data, DEFAULT_SORT),
    all: makeSortHelpers('all', this.data, DEFAULT_SORT)
  };

  readonly genreHelpers = makeSelectionHelpers(DEFAULT_GENDERS_KEY, this.criteria);
  readonly genreExcludedHelpers = makeSelectionHelpers(DEFAULT_EXCLUDED_GENDERS_KEY, this.criteria);
  readonly releaseDateHelpers = makeRangeHelpers(DEFAULT_RELEASE_KEY, this.criteria, DEFAULT_RELEASE_DATE, (a, b) => a.startYear === b.startYear && a.endYear === b.endYear);

  #loadFromStorage(): UserPreferences {
    const raw = localStorage.getItem(DEFAULT_STORAGE_KEY);
    try {
      return raw 
        ? {...DEFAULT_SORT_MEDIA, ...JSON.parse(raw) as UserPreferences }
        : {...DEFAULT_SORT_MEDIA };
    } catch (error) {
      console.error(error);
      localStorage.removeItem(DEFAULT_STORAGE_KEY);
      return { ...DEFAULT_SORT_MEDIA };
    }
  }

  setProviders(providers: Provider[]): void {
    this.data.update(current => ({...current, providers: providers}));
  }

  setCriteria<K extends keyof Criteria>(key: K, value: Criteria[K]) {
    this.data.update(current => ({...current, criteria: { ...current.criteria, [key]: value }}))
  }

  setAllCriteria(criteria: Criteria) {
    this.data.update(current => ({...current, criteria: criteria}));
  }

  constructor() {
    effect(() => {
      localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(this.data()));
    });
  }

}
