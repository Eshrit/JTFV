import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditLumpsumBillsComponent } from './edit-lumpsum-bills.component';

describe('EditLumpsumBillsComponent', () => {
  let component: EditLumpsumBillsComponent;
  let fixture: ComponentFixture<EditLumpsumBillsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [EditLumpsumBillsComponent]
    });
    fixture = TestBed.createComponent(EditLumpsumBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
