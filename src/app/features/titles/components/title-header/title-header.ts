import { Component, computed, inject, input, model } from '@angular/core';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from '@angular/material/form-field';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { BreakpointService } from '@core/services/breakpoint-service';
import { MatTabNavPanel, MatTabsModule } from '@angular/material/tabs';
import { NgTemplateOutlet } from '@angular/common';

@Component({
  selector: 'title-header',
  imports: [MatToolbarModule, MatButtonModule, MatIconModule, MatInputModule, MatFormFieldModule, RouterLink, RouterLinkActive, MatTabsModule, NgTemplateOutlet],
  templateUrl: './title-header.html',
  styleUrl: './title-header.scss',
})
export class TitleHeaderComponent {
  readonly dialog = inject(MatDialog);
  readonly #breakpointService = inject(BreakpointService);

  //readonly isSmallScren = computed(() => this.#breakpointService.hasSmallScreen());
  // < 960px : header sur deux rangées (logo + actions, puis onglets).
  readonly isSmallScreen = this.#breakpointService.hasSmallScreen;
  // < 600px : la recherche se réduit à un bouton.
  readonly isXSmallScreen = this.#breakpointService.hasXSmallScreen;

  readonly tabPanel = input.required<MatTabNavPanel>();

  readonly search = model('');

  readonly menus = [
    { label: 'Accueil', path: null, exact: true },
    { label: 'Nouveautés', path: null, exact: false },
    { label: 'Populaires', path: '/popular', exact: false },
    { label: 'Listes', path: null, exact: false }
  ];

}
