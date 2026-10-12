import { Component, computed, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { CriteriaItem } from '@shared/types/collection.types';
import { TitleFilterCriteriaRangeComponent } from '../title-filter-criteria-range/title-filter-criteria-range';
import { TitleFilterCriteriaListComponent } from '../title-filter-criteria-list/title-filter-criteria-list';
import { convertKeyToLabel } from '@shared/helpers/criteria.helpers';

@Component({
  selector: 'filter-criteria-group',
  imports: [MatMenuModule, MatButtonModule, MatIconModule, TitleFilterCriteriaRangeComponent, TitleFilterCriteriaListComponent],
  templateUrl: './title-filter-criteria-group.html',
  styleUrl: './title-filter-criteria-group.scss',
})
export class TitleFilterCriteriaGroupComponent {
  readonly title = input.required<string>();
  readonly criteria = input.required<CriteriaItem[]>();
  readonly resetRequested = output<CriteriaItem['key']>();

  readonly onConvertKeyToLabel = convertKeyToLabel;

  readonly showSubtitles = computed(() => this.criteria().length > 1);

  resetGroup() {
    this.criteria().forEach(c => this.resetRequested.emit(c.key));
  }

}
