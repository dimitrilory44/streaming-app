import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { Criteria } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { MatButtonModule } from '@angular/material/button';
import { TmdbApiService } from '@core/services/tmdb-api';
import { AllSortOptions, CriteriaItem } from '@shared/types/collection.types';
import { DEFAULT_COUNTRY_KEY, DEFAULT_DURATION_KEY, DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY, DEFAULT_MOVIES_AGE_KEY, DEFAULT_NOTE_KEY, DEFAULT_NOTES_KEY, DEFAULT_RELEASE_DATE, DEFAULT_RELEASE_KEY, DEFAULT_SORT, DEFAULT_TV_AGE_KEY, FILTER_MENUS } from '@shared/constants/preference-key';
import { TitleFilterCriteriaGroupComponent } from './title-filter-criteria-group/title-filter-criteria-group';
import { convertKeyToLabel } from '@shared/helpers/criteria.helpers';

@Component({
  selector: 'title-filter-criteria',
  imports: [MatMenuModule, MatButtonModule, MatIconModule, TitleFilterCriteriaGroupComponent],
  templateUrl: './title-filter-criteria.html',
  styleUrl: './title-filter-criteria.scss',
})
export class TitleFilterCriteriaComponent {
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #tmdbApiService = inject(TmdbApiService);

  readonly resetSort = input<AllSortOptions>();
  readonly resetSortChange = output<AllSortOptions>();

  readonly openMenuKey = signal<string | null>(null);

  readonly criteria: CriteriaItem[] = [
    { key: DEFAULT_RELEASE_KEY, type: 'range' },
    { key: DEFAULT_GENDERS_KEY, type: 'list', value: this.#tmdbApiService.allGenders },
    { key: DEFAULT_NOTE_KEY, type: 'range' },
    { key: DEFAULT_NOTES_KEY, type: 'range' },
    { key: DEFAULT_COUNTRY_KEY, type: 'list' },
    { key: DEFAULT_DURATION_KEY, type: 'range' },
    { key: DEFAULT_MOVIES_AGE_KEY, type: 'list' },
    { key: DEFAULT_TV_AGE_KEY, type: 'list' }
  ];

  readonly filteredCriteria = computed(() => this.criteria.filter(c => !c.groupKeyWith));
  readonly onConvertKeyToLabel = convertKeyToLabel;

  readonly menus = computed(() => FILTER_MENUS.map(menu => {
      const criteria = menu.members
        .map(key => this.filteredCriteria().find(c => c.key === key))
        .filter((c): c is NonNullable<typeof c> => !!c);
      return {
        ...menu,
        label: menu.label ?? this.onConvertKeyToLabel(menu.members[0]),
        criteria,
        isActive: menu.members.some(key => this.isCriterionActive(key)),
      };
    }).filter(menu => menu.criteria.length > 0)
  );

  isCriterionActive(key: keyof Criteria): boolean {
    const prefs = this.#userPreferencesService;
    switch (key) {
      case DEFAULT_RELEASE_KEY: return !prefs.releaseDateHelpers.isDefault();
      case DEFAULT_NOTE_KEY: return !prefs.noteHelpers.isDefault();
      case DEFAULT_GENDERS_KEY: return prefs.genreHelpers.hasItems() || prefs.genreExcludedHelpers.hasItems();
      default: {
        const value = prefs.criteria()?.[key];
        return Array.isArray(value) ? value.length > 0 : value != null;
      }
    }
  }

  onMenuOpened(key: string) { this.openMenuKey.set(key); }
  onMenuClosed(key: string) { this.openMenuKey.update(open => open === key ? null : open); }

  reset(key: keyof Criteria) {
    switch (key) {
      case DEFAULT_RELEASE_KEY:
        this.#userPreferencesService.setCriteria(DEFAULT_RELEASE_KEY, DEFAULT_RELEASE_DATE);
        return;
      case DEFAULT_GENDERS_KEY:
        this.#userPreferencesService.setCriteria(DEFAULT_GENDERS_KEY, []);
        this.#userPreferencesService.setCriteria(DEFAULT_EXCLUDED_GENDERS_KEY, []);
        return;
      case DEFAULT_NOTE_KEY:
        this.#userPreferencesService.setCriteria(DEFAULT_NOTE_KEY, 0);
        return;
      default:
        this.#userPreferencesService.setAllCriteria({});
        return;
    }
  }

  resetAll() {
    this.#userPreferencesService.setAllCriteria({});
    this.resetSortChange.emit(DEFAULT_SORT);
  }

}
