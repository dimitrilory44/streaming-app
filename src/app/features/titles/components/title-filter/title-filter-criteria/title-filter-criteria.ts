import { Component, computed, inject, input, output, signal, ViewChild } from '@angular/core';
import { MatMenu, MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { Criteria } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { MatButtonModule } from '@angular/material/button';
import { TmdbApiService } from '@core/services/tmdb-api';
import { AllSortOptions, CriteriaItem } from '@shared/types/collection.types';
import { DEFAULT_AGE_KEY, DEFAULT_COUNTRY_KEY, DEFAULT_DURATION_KEY, DEFAULT_EXCLUDED_GENDERS_KEY, DEFAULT_GENDERS_KEY, DEFAULT_MOVIES_AGE_KEY, DEFAULT_NOTE_KEY, DEFAULT_NOTES_KEY, DEFAULT_RELEASE_DATE, DEFAULT_RELEASE_KEY, DEFAULT_SORT, DEFAULT_TV_AGE_KEY } from '@shared/constants/preference-key';
import { TitleFilterCriteriaGroupComponent } from './title-filter-criteria-group/title-filter-criteria-group';
import { TitleFilterCriteriaListComponent } from './title-filter-criteria-list/title-filter-criteria-list';
import { TitleFilterCriteriaRangeComponent } from './title-filter-criteria-range/title-filter-criteria-range';
import { convertKeyToLabel } from '@shared/helpers/criteria.helpers';

@Component({
  selector: 'title-filter-criteria',
  imports: [MatMenuModule, MatButtonModule, MatIconModule, TitleFilterCriteriaListComponent, TitleFilterCriteriaRangeComponent, TitleFilterCriteriaGroupComponent],
  templateUrl: './title-filter-criteria.html',
  styleUrl: './title-filter-criteria.scss',
})
export class TitleFilterCriteriaComponent {
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #tmdbApiService = inject(TmdbApiService);

  readonly resetSort = input<AllSortOptions>();
  readonly resetSortChange = output<AllSortOptions>();

  @ViewChild('monoMenu') monoMenu!: MatMenu;
  @ViewChild('combinedMenu') combinedMenu!: MatMenu;

  readonly criteria: CriteriaItem[] = [
    { key: DEFAULT_RELEASE_KEY, type: 'range' },
    { key: DEFAULT_GENDERS_KEY, type: 'list', value: this.#tmdbApiService.allGenders },
    { key: DEFAULT_NOTE_KEY, type: 'range' },
    { key: DEFAULT_NOTES_KEY, type: 'list', groupKeyWith: DEFAULT_NOTE_KEY, value: signal([]) },
    { key: DEFAULT_COUNTRY_KEY, type: 'list' },
    { key: DEFAULT_DURATION_KEY, type: 'range' },
    { key: DEFAULT_AGE_KEY, type: 'list' },
    { key: DEFAULT_MOVIES_AGE_KEY, type: 'list', groupKeyWith: DEFAULT_AGE_KEY, value: signal([]) },
    { key: DEFAULT_TV_AGE_KEY, type: 'list', groupKeyWith: DEFAULT_AGE_KEY, value: signal([]) }
  ];

  readonly filteredCriteria = computed(() => this.criteria.filter(c => !c.groupKeyWith));
  readonly onConvertKeyToLabel = convertKeyToLabel;

  onCriteriaChange(key: keyof Criteria) {
    switch (key) {
      case DEFAULT_RELEASE_KEY: return !this.#userPreferencesService.releaseDateHelpers.isDefault();
      case DEFAULT_GENDERS_KEY: return this.#userPreferencesService.genreHelpers.hasItems() || this.#userPreferencesService.genreExcludedHelpers.hasItems();
      default: return false;
    }
  }

  isMultiMode(key: keyof Criteria): boolean {
    return this.criteria.some(item => item.groupKeyWith === key);
  }

  onGenresMenuOpened(key: keyof Criteria) { this.criteria.find(item => item.key === key)!.hasSelected = true; }

  onGenresMenuClosed(key: keyof Criteria) { this.criteria.find(item => item.key === key)!.hasSelected = false; }

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

}
