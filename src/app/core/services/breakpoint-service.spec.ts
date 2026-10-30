import { TestBed } from '@angular/core/testing';

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
});
