import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AlbComponent } from './alb.component';

describe('AlbComponent', () => {
  let component: AlbComponent;
  let fixture: ComponentFixture<AlbComponent>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      declarations: [AlbComponent]
    });
    fixture = TestBed.createComponent(AlbComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
