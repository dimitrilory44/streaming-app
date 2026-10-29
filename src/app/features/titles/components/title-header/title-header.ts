import { Component, inject, model } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';

@Component({
  selector: 'title-header',
  imports: [ MatToolbarModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, RouterLink, RouterLinkActive ],
  templateUrl: './title-header.html',
  styleUrl: './title-header.scss',
})
export class TitleHeaderComponent {
  readonly dialog = inject(MatDialog);
  readonly #breakpointObserver = inject(BreakpointObserver);

  // Même seuil que le mixin `mobile` de src/styles/_breakpoints.scss (max-width: 959.98px).
  readonly isSmallScreen = toSignal(
    this.#breakpointObserver
      .observe([Breakpoints.XSmall, Breakpoints.Small])
      .pipe(map((state) => state.matches)),
    { initialValue: false },
  );

  readonly search = model('');

  readonly menus = [
    { label: 'Accueil', path: null, exact: true },
    { label: 'Nouveautés', path: null, exact: false },
    { label: 'Populaires', path: '/popular', exact: false },
    { label: 'Listes', path: null, exact: false }
  ];

}
