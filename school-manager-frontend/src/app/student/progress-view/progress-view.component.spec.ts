import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ProgressViewComponent } from './progress-view.component';

describe('ProgressViewComponent', () => {
  let component: ProgressViewComponent;
  let fixture: ComponentFixture<ProgressViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProgressViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ProgressViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
