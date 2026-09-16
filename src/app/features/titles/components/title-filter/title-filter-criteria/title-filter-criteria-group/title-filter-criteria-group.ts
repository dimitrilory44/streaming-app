import { Component, input, output } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { Criteria } from '@core/models/media-model';
import { CriteriaItem } from '@shared/types/collection.types';
import { convertKeyToLabel } from '@shared/helpers/criteria.helpers';
import { TitleFilterCriteriaRangeComponent } from '../title-filter-criteria-range/title-filter-criteria-range';

@Component({
  selector: 'filter-criteria-group',
  imports: [MatMenuModule, MatButtonModule, MatIconModule, MatCheckbox, TitleFilterCriteriaRangeComponent],
  templateUrl: './title-filter-criteria-group.html',
  styleUrl: './title-filter-criteria-group.scss',
})
export class TitleFilterCriteriaGroupComponent {
  readonly criteria = input.required<CriteriaItem[]>();
  readonly resetRequested = output<keyof Criteria>();

  readonly onConvertKeyToLabel = convertKeyToLabel;

}
