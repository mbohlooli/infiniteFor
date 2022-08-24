import { Component, ElementRef, EventEmitter, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, of, Subscription } from 'rxjs';

@Component({
  selector: 'infinite-list',
  templateUrl: './infinite-list.component.html',
  styleUrls: ['./infinite-list.component.css']
})
export class InfiniteListComponent implements OnDestroy {
  @ViewChild('listContainer') listContainer!: ElementRef;

  @Output('scroll') scrollEmitter = new EventEmitter<any>();

  holderHeightInPx = 22;
  rowHeight = 22;

  private _containerWidth!: number;
  private _containerHeight!: number;
  private _scrollPosition = new BehaviorSubject(0);
  private _subscription = new Subscription();

  get scrollPosition(): Observable<Number> {
    return this._scrollPosition.asObservable();
  }

  measure(): { width: number, height: number } {
    if (this.listContainer && this.listContainer.nativeElement) {
      let rect = this.listContainer.nativeElement.getBoundingClientRect();
      this._containerWidth = rect.width;
      this._containerHeight = rect.height;
      return { width: this._containerWidth, height: this._containerHeight };
    }
    return { width: 0, height: 0 };
  }

  emittScroll(scrollInfo: any) {
    this._scrollPosition.next(scrollInfo.scrollTop);
    // this._subscription.add(of().subscribe(() => this._scrollPosition.next(scrollInfo.scrollY)));
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }
}
