import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GradeManagementComponent } from './grade-management.component';

describe('GradeManagementComponent', () => {
  let component: GradeManagementComponent;
  let fixture: ComponentFixture<GradeManagementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GradeManagementComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GradeManagementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
