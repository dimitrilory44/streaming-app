import { computed, effect, Injectable, signal } from '@angular/core';
import { Criteria, Provider, UserPreferences } from '@core/models/media-model';
import * as PREF from '@shared/constants/filter-preferences';
import { makeRangeHelpers, makeSelectionHelpers, makeSortHelpers } from '@shared/helpers/collection.helpers';
import { MediaType } from '@shared/types/collection.types';

@Injectable({
  providedIn: 'root',
})
export class UserPreferencesService {
  readonly data = signal<UserPreferences>(this.#loadFromStorage());
  readonly criteria = computed(() => this.data().criteria);
  
  readonly providerHelpers = makeSelectionHelpers(PREF.DEFAULT_PROVIDERS_KEY, this.data);
  readonly sortHelpers: Record<MediaType, ReturnType<typeof makeSortHelpers>> = {
    movie: makeSortHelpers('movie', this.data, PREF.DEFAULT_SORT),
    tv: makeSortHelpers('tv', this.data, PREF.DEFAULT_SORT),
    all: makeSortHelpers('all', this.data, PREF.DEFAULT_SORT)
  };

  readonly genreHelpers = makeSelectionHelpers(PREF.DEFAULT_GENDERS_KEY, this.criteria);
  readonly genreExcludedHelpers = makeSelectionHelpers(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, this.criteria);
  readonly releaseDateHelpers = makeRangeHelpers(PREF.DEFAULT_RELEASE_KEY, this.criteria, PREF.DEFAULT_RELEASE_DATE, (a, b) => a.min === b.min && a.max === b.max);
  readonly noteHelpers = makeRangeHelpers(PREF.DEFAULT_NOTE_KEY, this.criteria, 0);
  readonly notesHelpers = makeRangeHelpers(PREF.DEFAULT_NOTES_KEY, this.criteria, 0);
  readonly countryHelpers = makeSelectionHelpers(PREF.DEFAULT_COUNTRY_KEY, this.criteria);
  readonly durationHelpers = makeRangeHelpers(PREF.DEFAULT_DURATION_KEY, this.criteria, PREF.DEFAULT_DURATION, (a, b) => a.min === b.min && a.max === b.max);

  #loadFromStorage(): UserPreferences {
    const raw = localStorage.getItem(PREF.DEFAULT_STORAGE_KEY);
    try {
      return raw 
        ? {...PREF.DEFAULT_SORT_MEDIA, ...JSON.parse(raw) as UserPreferences }
        : {...PREF.DEFAULT_SORT_MEDIA };
    } catch (error) {
      console.error(error);
      localStorage.removeItem(PREF.DEFAULT_STORAGE_KEY);
      return { ...PREF.DEFAULT_SORT_MEDIA };
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
      localStorage.setItem(PREF.DEFAULT_STORAGE_KEY, JSON.stringify(this.data()));
    });
  }

}
