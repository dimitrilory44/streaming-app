import { Component, input, output } from '@angular/core';

@Component({
  selector: 'state-message',
  imports: [],
  templateUrl: './state-message.html',
  styleUrl: './state-message.scss',
})
export class StateMessage {
  readonly title = input<string>()
  readonly illustration = input<string>();
  readonly hint = input<string>();
  readonly retryLabel = input<string>('Réessayer');
  readonly showRetry = input(true);

  readonly retry = output<void>();
}
