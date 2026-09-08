import { Component, input, viewChild, ElementRef, output, afterNextRender, effect, signal } from '@angular/core';
import { TmdbImagePipe } from '@shared/pipes/tmdb-image.pipe';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Media } from '@shared/types/collection.types';
import { getMediaTitle } from '@shared/helpers/collection.helpers';

@Component({
  selector: 'title-list',
  imports: [TmdbImagePipe, MatCardModule, MatProgressSpinnerModule],
  templateUrl: './title-list.html',
  styleUrl: './title-list.scss',
})
export class TitleListComponent {
  readonly items = input<Media[]>([]);
  readonly loading = input<boolean>(false);
  readonly loadMore = output<void>();

  readonly scrollAnchor = viewChild.required<ElementRef>('scrollAnchor');
  readonly isFetching = signal(false);

  readonly getTitle = getMediaTitle;

  constructor() {
    effect(() => {
      if (!this.loading()) {
        this.isFetching.set(false);
      }
    });
    afterNextRender(() => {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.loading() && !this.isFetching()) {
          this.isFetching.set(true);
          this.loadMore.emit();
        }
      }, {
        threshold: 0,
        rootMargin: '50px' 
      });

      observer.observe(this.scrollAnchor().nativeElement);
    });
  }
  
}
