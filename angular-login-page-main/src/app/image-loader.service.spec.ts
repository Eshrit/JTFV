import { TestBed } from '@angular/core/testing';
import { ImageLoaderService } from './core/services/image-loader.service';


describe('ImageLoaderService', () => {
  let service: ImageLoaderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ImageLoaderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
