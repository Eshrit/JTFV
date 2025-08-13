import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditRelianceBillsComponent } from './edit-reliance-bills.component';

describe('EditRelianceBillsComponent', () => {
  let component: EditRelianceBillsComponent;
  let fixture: ComponentFixture<EditRelianceBillsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditRelianceBillsComponent]
    });
    fixture = TestBed.createComponent(EditRelianceBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
