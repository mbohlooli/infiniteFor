import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RecyclerViewComponent } from './recycler-view.component';

describe('RecyclerViewComponent', () => {
  let component: RecyclerViewComponent;
  let fixture: ComponentFixture<RecyclerViewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ RecyclerViewComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RecyclerViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
