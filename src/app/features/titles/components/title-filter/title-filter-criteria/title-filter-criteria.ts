import { Component, computed, inject, input, output, signal } from '@angular/core';
import { MatMenuModule } from "@angular/material/menu";
import { MatIconModule } from "@angular/material/icon";
import { Criteria } from '@core/models/media-model';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import { MatButtonModule } from '@angular/material/button';
import { TmdbApiService } from '@core/services/tmdb-api';
import { AllSortOptions, CriteriaItem } from '@shared/types/collection.types';
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

  isCriterionActive(key: keyof Criteria): boolean { return this.#userPreferencesService.isCriterionActive(key); }

  onMenuOpened(key: string) { this.openMenuKey.set(key); }
  onMenuClosed(key: string) { this.openMenuKey.update(open => open === key ? null : open); }

  reset(key: CriteriaItem['key']) { return this.#userPreferencesService.resetCriterion(key); }

  resetAll() {
    this.#userPreferencesService.resetAllCriteria();
    this.resetSortChange.emit(PREF.DEFAULT_SORT);
  }

}
