import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { inject, Injectable } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class BreakpointService {
  readonly #breakpointObserver = inject(BreakpointObserver);

  // Même seuil que le mixin `mobile` de src/styles/_breakpoints.scss (max-width: 959.98px).
  readonly hasSmallScreen = toSignal(
    this.#breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );
}
