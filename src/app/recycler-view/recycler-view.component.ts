import { AfterViewInit, Component, ElementRef, Input, OnInit, Output, ViewChild } from '@angular/core';
import { BehaviorSubject, Observable, Subscription, fromEvent as observableFromEvent, tap, debounceTime, filter, map, } from 'rxjs';
import { getScrollBarWidth } from '../utils';

const INVALID_POSITION = -1;
const SCROLL_STOP_TIME_THRESHOLD = 200; // in milliseconds
enum SCROLL_STATE {
  SCROLLING,
  IDLE
}

@Component({
  selector: 'recycler-view',
  templateUrl: './recycler-view.component.html',
  styleUrls: ['./recycler-view.component.css']
})
export class RecyclerViewComponent implements AfterViewInit {
  @ViewChild('listContainer') listContainer!: ElementRef;

  @Input('newScrollPosition')
  set newScrollPosition(p: number) {
    this.listContainer.nativeElement.scrollTop = p;
    if (!this.holderHeight)
      this._initialScrollTop = p;
    this._scrollPosition.next(p);
  }

  @Output('scrollPosition')
  get scrollPosition(): Observable<number> {
    return this._scrollPosition.asObservable();
  }

  currentScrollState = SCROLL_STATE.IDLE;

  scrollbarStyle!: string;
  scrollbarWidth!: number;


  private _holderHeight!: number;
  private _containerWidth!: number;
  private _containerHeight!: number;

  private _ignoreScrollEvent = false;

  private _scrollState = new BehaviorSubject<SCROLL_STATE>(SCROLL_STATE.IDLE);
  private _scrollPosition = new BehaviorSubject<number>(0);
  private _sizeChange = new BehaviorSubject<number[]>([0, 0]);

  private _subscription = new Subscription();

  private _initialScrollTop = INVALID_POSITION;

  set holderHeight(height: number) {
    if (typeof height === 'undefined') return;

    this._holderHeight = height;

    if (this._holderHeight === 0)
      this.listContainer.nativeElement.scrollTop = 0;
    if (this._initialScrollTop !== INVALID_POSITION && this._holderHeight !== 0)
      setTimeout(() => {
        this.listContainer.nativeElement.scrollTop = this._initialScrollTop;
        this._initialScrollTop = INVALID_POSITION;
      });
  }

  get holderHeight(): number {
    return this._holderHeight;
  }

  get holderHeightInPx(): string {
    return this.holderHeight ? this.holderHeight + 'px' : '100%';
  }

  constructor() {
    this.scrollbarWidth = getScrollBarWidth();
  }

  ngAfterViewInit() {
    if (this.scrollbarStyle === 'hide-scrollbar') {
      this.listContainer.nativeElement.style.right = (0 - this.scrollbarWidth) + 'px';
      this.listContainer.nativeElement.style.paddingRight = this.scrollbarWidth + 'px';
    }

    if (window)
      this._subscription.add(
        observableFromEvent(window, 'resize')
          .subscribe(() => this.requestMeasure())
      );

    this._subscription.add(
      observableFromEvent(this.listContainer.nativeElement, 'scroll')
        .pipe(
          filter(() => {
            if (!this._ignoreScrollEvent) return true;
            this._ignoreScrollEvent = false;
            return false;
          }),
          map(() => this.listContainer.nativeElement.scrollTop),
        )
        .subscribe((scrollY: number) => this._scrollPosition.next(scrollY))
    );

    this._subscription.add(
      this.scrollPosition.pipe(
        tap(() => {
          if (this.currentScrollState !== SCROLL_STATE.IDLE) return;

          this.currentScrollState = SCROLL_STATE.SCROLLING;
          this._scrollState.next(this.currentScrollState);
        }),
        debounceTime(SCROLL_STOP_TIME_THRESHOLD)
      ).subscribe(() => {
        if (this.currentScrollState !== SCROLL_STATE.SCROLLING) return;
        this.currentScrollState = SCROLL_STATE.IDLE;
        this._scrollState.next(this.currentScrollState);
      })
    );

    setTimeout(() => this.requestMeasure());
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
  }

  measure(): { width: number, height: number } {
    if (!this.listContainer || !this.listContainer.nativeElement) return { width: 0, height: 0 };

    let rect = this.listContainer.nativeElement.getBoundingClientRect();
    this._containerWidth = rect.width - this.scrollbarWidth;
    this._containerHeight = rect.height;
    return { width: this._containerWidth, height: this._containerHeight };
  }

  requestMeasure() {
    let { width, height } = this.measure();
    this._sizeChange.next([width, height]);
  }
}
