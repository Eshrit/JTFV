import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RelianceBillsComponent } from './reliance-bills.component';

describe('RelianceBillsComponent', () => {
  let component: RelianceBillsComponent;
  let fixture: ComponentFixture<RelianceBillsComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [RelianceBillsComponent]
    });
    fixture = TestBed.createComponent(RelianceBillsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
