import { Component, computed, effect, inject, input, linkedSignal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Certification, Country, Criteria, CriteriaListItem, Genre } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { DEFAULT_COUNTRY_KEY, DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY, DEFAULT_MOVIES_AGE_KEY, DEFAULT_TV_AGE_KEY } from '@shared/constants/filter-preferences';
import { makeSelectionHelpers } from '@shared/helpers/collection.helpers';
import { ArrayElement, ArrayKeys, GenderState } from '@shared/types/collection.types';

@Component({
  selector: 'title-filter-criteria-list',
  imports: [MatCheckbox, MatButtonModule, MatIconModule],
  templateUrl: './title-filter-criteria-list.html',
  styleUrl: './title-filter-criteria-list.scss',
})
export class TitleFilterCriteriaListComponent {
  readonly #userPreferencesService = inject(UserPreferencesService);

  readonly criterion = input.required<CriteriaListItem<ArrayKeys<Criteria> & keyof Criteria>>();
  
  readonly #pageSize = computed(() => this.criterion().pageSize ?? Infinity);
  readonly limit = linkedSignal(() => this.#pageSize());
  
  readonly countries = computed(() => this.criterion().value as Country[] ?? []);
  readonly genders = computed(() => this.criterion().value as Genre[] ?? []);
  readonly certificationMovie = computed(() => this.criterion().value as Certification[] ?? []);
  readonly certificationSerie = computed(() => this.criterion().value as Certification[] ?? []);
  
  readonly #orderedCountries = computed(() => {
    const pinned = this.criterion().pinnedIds ?? [];
    const rank = (id: number) => {
      const i = pinned.indexOf(id);
      return i === -1 ? pinned.length : i;
    };
    return [...this.countries()].sort((a, b) => rank(a.id) - rank(b.id));
  });

  readonly #selectedIds = computed(() => {
    const list = (this.#userPreferencesService.criteria()?.[this.criterion().key] ?? []) as { id: number }[];
    return new Set(list.map(i => i.id));
  });

  readonly #selectedCertification = computed(() => {
    const criteria = this.#userPreferencesService.criteria();
    const lists = [criteria?.[DEFAULT_MOVIES_AGE_KEY], criteria?.[DEFAULT_TV_AGE_KEY]];
    return new Set(lists.flatMap(l => (l ?? []).map(i => i.certification)));
  });

  readonly genderStates = computed<Map<number, GenderState>>(() => {
    const included = this.#userPreferencesService.genreHelpers.items();
    const excluded = this.#userPreferencesService.genreExcludedHelpers.items();

    const map = new Map<number, GenderState>();
    included.forEach(g => map.set(g.id, 'includedGenders'));
    excluded.forEach(g => map.set(g.id, 'excludedGenders'));

    return map;
  });

  readonly visibleCountries = computed<Country[]>(() => {
    const countries = this.#orderedCountries().filter((item): item is Country => 'code' in item);
    return [
      ...countries.slice(0, this.limit()),
      ...countries.slice(this.limit()).filter(i => this.#selectedIds().has(i.id)),
    ];
  });

  readonly remaining = computed(() => Math.max(this.#orderedCountries().length - this.limit(), 0));

  showMore() {
    this.limit.update(n => n + (this.criterion().pageSize ?? 0));
  }

  isSelectionSelected(key: keyof Criteria, idItem: number): boolean {
    switch (key) {
      case DEFAULT_GENDERS_KEY: return this.genderStates().get(idItem) === 'includedGenders';
      case DEFAULT_COUNTRY_KEY:
        return this.#selectedIds().has(idItem);
      default: return false;
    }
  }

  isSelectionSelectedByCertif(certifItem: string): boolean {
    return this.#selectedCertification().has(certifItem);
  }
 
  onGenreCheckboxClick(event: MouseEvent, item: Genre): void {
    event.preventDefault();
    this.cycleGender(item);
  }

  onCriteriaCheckboxClick<K extends ArrayKeys<Criteria> & keyof Criteria>(criteria: CriteriaListItem<K>, item: ArrayElement<NonNullable<Criteria[K]>>): void {
    this.toggleItem(criteria.key, item);
  }

  toggleItem<K extends ArrayKeys<Criteria> & keyof Criteria>(key: K, item: ArrayElement<NonNullable<Criteria[K]>>): void {
    const current = makeSelectionHelpers(key, this.#userPreferencesService.criteria).items();
    const exists = current.some(g => g.id === item.id);
    const updated = exists
      ? current.filter(g => g.id !== item.id)
      : [...current, item];
    this.#userPreferencesService.setCriteria(key, updated.sort((a, b) => a.id - b.id) as Criteria[K]);
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

  constructor() {
    effect(() => {
      this.limit.set(this.criterion().pageSize ?? Infinity)
    });
  }

}
