import { Component, input, output } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ImgFallbackDirective } from '@shared/directives/img-fallback.directive';

@Component({
  selector: 'icon-chip',
  imports: [MatIconModule, ImgFallbackDirective],
  templateUrl: './icon-chip.html',
  styleUrl: './icon-chip.scss',
})
export class IconChipComponent {
  readonly removable = input<boolean>(true);

  readonly iconUrl = input.required<string>();
  readonly label = input.required<string>();
  readonly removed = output<void>();

  onRemove(event: Event): void {
    event.stopPropagation();
    this.removed.emit();
  }
  
}
