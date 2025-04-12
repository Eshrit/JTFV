import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AdbComponent } from './adb.component';

describe('AdbComponent', () => {
  let component: AdbComponent;
  let fixture: ComponentFixture<AdbComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AdbComponent]
    });
    fixture = TestBed.createComponent(AdbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
