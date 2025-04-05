import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeViewComponent } from './grade-view.component';

describe('GradeViewComponent', () => {
  let component: GradeViewComponent;
  let fixture: ComponentFixture<GradeViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradeViewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradeViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
