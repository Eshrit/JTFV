import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddLumpsumBillsComponent } from './add-lumpsum-bills.component';

describe('AddLumpsumBillsComponent', () => {
  let component: AddLumpsumBillsComponent;
  let fixture: ComponentFixture<AddLumpsumBillsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddLumpsumBillsComponent]
    });
    fixture = TestBed.createComponent(AddLumpsumBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
