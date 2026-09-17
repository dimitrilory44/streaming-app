import { Component, computed, inject, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { Criteria, CriteriaListItem, Genre } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY } from '@shared/constants/preference-key';
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

  readonly genderStates = computed<Map<number, GenderState>>(() => {
    const included = this.#userPreferencesService.genreHelpers.items();
    const excluded = this.#userPreferencesService.genreExcludedHelpers.items();

    const map = new Map<number, GenderState>();
    included.forEach(g => map.set(g.id, 'includedGenders'));
    excluded.forEach(g => map.set(g.id, 'excludedGenders'));

    return map;
  });

  isSelectionSelected(key: keyof Criteria, idItem: number): boolean {
    switch (key) {
      case DEFAULT_GENDERS_KEY: return this.genderStates().get(idItem) === 'includedGenders';
      default: return false;
    }
  }

  onCriteriaCheckboxClick(event: MouseEvent, criteria: CriteriaListItem<ArrayKeys<Criteria> & keyof Criteria>, item: Genre): void {
    if (criteria.key === DEFAULT_GENDERS_KEY) {
      event.preventDefault();
      this.cycleGender(item);
    } else {
      this.toggleItem(criteria.key, item);
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
}
