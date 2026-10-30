import { Component, computed, inject, signal } from '@angular/core';
import { MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Criteria } from '@core/models/media-model';
import { TmdbApiService } from '@core/services/tmdb-api';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';
import { convertKeyToLabel } from '@shared/helpers/criteria.helpers';
import { TitleFilterCriteriaGroupComponent } from '../title-filter-criteria/title-filter-criteria-group/title-filter-criteria-group';

@Component({
  selector: 'title-filter-criteria-sheet',
  imports: [MatButtonModule, MatIconModule, MatExpansionModule, TitleFilterCriteriaGroupComponent],
  templateUrl: './title-filter-criteria-sheet.html',
  styleUrl: './title-filter-criteria-sheet.scss',
})
export class TitleFilterCriteriaSheet {
  readonly #bottomSheetRef = inject<MatBottomSheetRef<TitleFilterCriteriaSheet>>(MatBottomSheetRef);
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #tmdbApiService = inject(TmdbApiService);

  readonly panelOpenState = signal(false);

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

  resetAll() {
    this.#userPreferencesService.resetAllCriteria();
    this.#bottomSheetRef.dismiss();
  }

}
