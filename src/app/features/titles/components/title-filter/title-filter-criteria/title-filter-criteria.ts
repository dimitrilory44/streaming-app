import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { Criteria } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { MatButtonModule } from '@angular/material/button';
import { TmdbApiService } from '@core/services/tmdb-api';
import { AllSortOptions } from '@shared/types/collection.types';
import * as PREF from '@shared/constants/filter-preferences';
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

  readonly criteriaList = computed(() => {
    return PREF.CRITERIA_LIST.map(criteria => {
      const buildCriteria = criteria.item.map(c =>
        c.key === PREF.DEFAULT_GENDERS_KEY ? { ...c, value: this.#tmdbApiService.allGenders() ?? [] }
          : c.key === PREF.DEFAULT_COUNTRY_KEY ? { ...c, value: this.#tmdbApiService.allCountries.value() ?? [] }
            : c.key === PREF.DEFAULT_MOVIES_AGE_KEY ? { ...c, value: this.#tmdbApiService.certificationsMovie() }
              : c.key === PREF.DEFAULT_TV_AGE_KEY ? { ...c, value: this.#tmdbApiService.certificationsSerie() }
                : c
      );
      return {
        ...criteria,
        label: criteria.label ?? convertKeyToLabel(buildCriteria[0].key),
        items: buildCriteria,
        isActive: buildCriteria.some(c => this.isCriterionActive(c.key)),
      };
    });
  });

  isCriterionActive(key: keyof Criteria): boolean {
    switch (key) {
      case PREF.DEFAULT_RELEASE_KEY: return !this.#userPreferencesService.releaseDateHelpers.isDefault();
      case PREF.DEFAULT_NOTE_KEY: return !this.#userPreferencesService.noteHelpers.isDefault();
      case PREF.DEFAULT_GENDERS_KEY: return this.#userPreferencesService.genreHelpers.hasItems() || this.#userPreferencesService.genreExcludedHelpers.hasItems();
      case PREF.DEFAULT_COUNTRY_KEY: return this.#userPreferencesService.countryHelpers.hasItems();
      case PREF.DEFAULT_DURATION_KEY: return !this.#userPreferencesService.durationHelpers.isDefault();
      case PREF.DEFAULT_MOVIES_AGE_KEY: return this.#userPreferencesService.ageMoviesHelpers.hasItems();
      case PREF.DEFAULT_TV_AGE_KEY: return this.#userPreferencesService.ageSeriesHelpers.hasItems();
      default: {
        const value = this.#userPreferencesService.criteria()?.[key];
        return Array.isArray(value) ? value.length > 0 : value != null;
      }
    }
  }

  onMenuOpened(key: string) { this.openMenuKey.set(key); }
  onMenuClosed(key: string) { this.openMenuKey.update(open => open === key ? null : open); }

  reset(key: keyof Criteria) {
    switch (key) {
      case PREF.DEFAULT_RELEASE_KEY:
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_RELEASE_KEY, PREF.DEFAULT_RELEASE_DATE);
        return;
      case PREF.DEFAULT_GENDERS_KEY:
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_GENDERS_KEY, []);
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_EXCLUDED_GENDERS_KEY, []);
        return;
      case PREF.DEFAULT_NOTE_KEY:
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_NOTE_KEY, 0);
        return;
      case PREF.DEFAULT_COUNTRY_KEY:
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_COUNTRY_KEY, []);
        return;
      case PREF.DEFAULT_DURATION_KEY:
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_DURATION_KEY, PREF.DEFAULT_DURATION);
        return;
      case PREF.DEFAULT_MOVIES_AGE_KEY:
      case PREF.DEFAULT_TV_AGE_KEY:
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_MOVIES_AGE_KEY, []);
        this.#userPreferencesService.setCriteria(PREF.DEFAULT_TV_AGE_KEY, []);
        return;
      default:
        this.#userPreferencesService.setAllCriteria({});
        return;
    }
  }

  resetAll() {
    this.#userPreferencesService.setAllCriteria({});
    this.resetSortChange.emit(PREF.DEFAULT_SORT);
  }

}
