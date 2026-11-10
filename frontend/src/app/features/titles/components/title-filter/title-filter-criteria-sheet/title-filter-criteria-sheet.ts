import { Component, computed, inject, signal } from '@angular/core';
import { MAT_BOTTOM_SHEET_DATA, MatBottomSheetRef } from '@angular/material/bottom-sheet';
import { MatButtonModule } from '@angular/material/button';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { Criteria, CriteriaSheetData } from '@core/models/media-model';
import { TmdbApiService } from '@core/services/tmdb-api';
import { UserPreferencesService } from '@core/services/user-preferences-service';
import * as PREF from '@shared/constants/filter-preferences';
import { convertKeyToLabel } from '@shared/helpers/criteria.helpers';
import { TitleFilterCriteriaGroupComponent } from '../title-filter-criteria/title-filter-criteria-group/title-filter-criteria-group';
import { CdkDrag, CdkDragEnd, CdkDragHandle, DragRef, Point } from '@angular/cdk/drag-drop';
import { DecimalPipe } from '@angular/common';

@Component({
  selector: 'title-filter-criteria-sheet',
  imports: [MatButtonModule, MatIconModule, MatExpansionModule, TitleFilterCriteriaGroupComponent, CdkDrag, CdkDragHandle],
  templateUrl: './title-filter-criteria-sheet.html',
  styleUrl: './title-filter-criteria-sheet.scss',
})
export class TitleFilterCriteriaSheet {
  readonly #bottomSheetRef = inject<MatBottomSheetRef<TitleFilterCriteriaSheet>>(MatBottomSheetRef);
  readonly #data = inject<CriteriaSheetData>(MAT_BOTTOM_SHEET_DATA);
  readonly #closeThreshold = 100;
  readonly #userPreferencesService = inject(UserPreferencesService);
  readonly #tmdbApiService = inject(TmdbApiService);

  readonly activeFilter = computed(() => this.#data.activeFilter());

  readonly keepBelowStart = (pointer: Point, _dragRef: DragRef, initialRect: DOMRect, pickupInElement: Point): Point => ({
    x: initialRect.left,
    y: Math.max(initialRect.top, pointer.y - pickupInElement.y),
  });

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
    this.#userPreferencesService.sortHelpers[this.#data.mediaType].set(PREF.DEFAULT_SORT);
    this.#bottomSheetRef.dismiss();
  }

  onDragEnded(event: CdkDragEnd): void {
    if (event.distance.y > this.#closeThreshold) {
      this.#bottomSheetRef.dismiss();
    } else {
      requestAnimationFrame(() => event.source.reset());
    }
  }

}
