import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddMerchantComponent } from './add-merchant.component';

describe('AddMerchantComponent', () => {
  let component: AddMerchantComponent;
  let fixture: ComponentFixture<AddMerchantComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AddMerchantComponent]
    });
    fixture = TestBed.createComponent(AddMerchantComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
