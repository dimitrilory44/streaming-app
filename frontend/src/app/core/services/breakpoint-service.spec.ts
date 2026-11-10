import { TestBed } from '@angular/core/testing';
import { BreakpointObserver, BreakpointState, Breakpoints } from '@angular/cdk/layout';
import { Subject } from 'rxjs';

import { BreakpointService } from './breakpoint-service';
import { beforeEach, describe, expect, it } from 'vitest';

describe('Breakpoint', () => {
  let service: BreakpointService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BreakpointService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('hasXSmallScreen', () => {
    // Un flux par requête observée, pour piloter chaque seuil séparément.
    const streams = new Map<string, Subject<BreakpointState>>();
    const emit = (query: string, matches: boolean) =>
      streams.get(query)!.next({ matches, breakpoints: { [query]: matches } });

    beforeEach(() => {
      streams.clear();
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [{
          provide: BreakpointObserver,
          useValue: {
            observe: (value: string | string[]) => {
              const key = ([] as string[]).concat(value).join(',');
              const stream = new Subject<BreakpointState>();
              streams.set(key, stream);
              return stream;
            },
          },
        }],
      });
      service = TestBed.inject(BreakpointService);
    });

    it('vaut false avant la première émission', () => {
      expect(service.hasXSmallScreen()).toBe(false);
    });

    it('suit uniquement le seuil XSmall', () => {
      emit(Breakpoints.XSmall, true);
      expect(service.hasXSmallScreen()).toBe(true);

      emit(Breakpoints.XSmall, false);
      expect(service.hasXSmallScreen()).toBe(false);
    });

    it('reste indépendant de hasSmallScreen (tablette)', () => {
      emit([Breakpoints.XSmall, Breakpoints.Small].join(','), true);
      emit(Breakpoints.XSmall, false);

      expect(service.hasSmallScreen()).toBe(true);
      expect(service.hasXSmallScreen()).toBe(false);
    });
  });
});
