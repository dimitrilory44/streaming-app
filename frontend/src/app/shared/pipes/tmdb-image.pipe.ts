import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '@environments/environment';

export type TmdbImageSize = 'w45' | 'w92' | 'w154' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' | 'original';

@Pipe({
  name: 'tmdbImage',
  standalone: true,
})
export class TmdbImagePipe implements PipeTransform {
  transform(
    path: string | null | undefined, 
    size: TmdbImageSize = 'w500',
    fallback: string = 'assets/placeholder.png'
  ): string {
    if (!path) return fallback;
    return `${environment.tmdbImageBaseUrl}/${size}${path}`;
  }
}
