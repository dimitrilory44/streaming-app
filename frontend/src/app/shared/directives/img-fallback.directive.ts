import { Directive, ElementRef, inject, input, HostListener } from '@angular/core';

@Directive({
  selector: 'img[appImgFallback]',
})
export class ImgFallbackDirective {
 
  fallbackSrc = input<string>('assets/image-fallback.svg', { alias: 'appImgFallback' });

  readonly el = inject(ElementRef<HTMLImageElement>);
  private hasErrored = false;

  @HostListener('error')
  onError(): void {
    if (this.hasErrored) return;
    
    this.hasErrored = true;
    this.el.nativeElement.src = this.fallbackSrc();
  }
}
