import { DecimalPipe } from '@angular/common';
import { Component, input, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SwiperDirective } from '@shared/directives/swiper.directive';
import { getMediaTitle } from '@shared/helpers/collection.helpers';
import { TmdbImagePipe } from '@shared/pipes/tmdb-image.pipe';
import { Media } from '@shared/types/collection.types';

@Component({
  selector: 'title-carousel',
  imports: [TmdbImagePipe, DecimalPipe, SwiperDirective, MatIconModule, MatButtonModule],
  templateUrl: './title-carousel.html',
  styleUrl: './title-carousel.scss',
})
export class TitleCarouselComponent {
  readonly items = input<Media[]>([]);
  
  readonly hoveredMovieId = signal<number | null>(null);
  readonly getTitle = getMediaTitle;

  readonly swiperConfig = {
    slidesPerView: 'auto' as const,
    spaceBetween: 16,
    navigation: {
      nextEl: '.swiper-button-next',
      prevEl: '.swiper-button-prev',
    }
  };

  onEnter(movieId: number) {
    this.hoveredMovieId.set(movieId);
  }

  onLeave() {
    this.hoveredMovieId.set(null);
  }
}
