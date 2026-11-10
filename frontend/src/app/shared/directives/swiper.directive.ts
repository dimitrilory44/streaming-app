// swiper.directive.ts
import { Directive, ElementRef, OnDestroy, input, afterNextRender, inject } from '@angular/core';
import Swiper from 'swiper';
import { Navigation, Pagination } from 'swiper/modules';
import type { SwiperOptions } from 'swiper/types';

@Directive({
  selector: '[appSwiper]'
})
export class SwiperDirective implements OnDestroy {
  readonly el = inject(ElementRef<HTMLElement>);
  
  readonly config = input<SwiperOptions>({});
  private swiper?: Swiper;

  constructor() {
    afterNextRender(() => {
      this.swiper = new Swiper(this.el.nativeElement, {
        modules: [Navigation, Pagination],
        observer: true,
        observeParents: true,
        ...this.config(),
      });
    });

  }

  ngOnDestroy(): void {
    this.swiper?.destroy(true, true);
  }
}