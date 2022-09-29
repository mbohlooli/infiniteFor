import {
  Directive,
  DoCheck,
  EmbeddedViewRef,
  Input,
  isDevMode,
  IterableChanges,
  IterableDiffer,
  IterableDiffers,
  NgIterable,
  OnChanges,
  OnDestroy,
  OnInit,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  TrackByFunction,
  ViewContainerRef,
  ViewRef
} from '@angular/core';
import { Subscription } from 'rxjs';
import { Recycler } from './recycler';
import { RecyclerViewComponent } from './recycler-view/recycler-view.component';
import { sum } from './utils';

export class InfiniteRow {
  constructor(public $implicit: any, public index: number, public count: number) {
  }

  get first(): boolean {
    return this.index === 0;
  }

  get last(): boolean {
    return this.index === this.count - 1;
  }

  get even(): boolean {
    return this.index % 2 === 0;
  }

  get odd(): boolean {
    return !this.even;
  }
}

@Directive({
  selector: '[infiniteFor][infiniteForOf]'
})
export class InfiniteForOfDirective<T> implements OnChanges, DoCheck, OnInit, OnDestroy {
  @Input('infiniteForOf') data!: NgIterable<T>;

  @Input('infiniteForTrackBy')
  set trackBy(fn: TrackByFunction<T>) {
    if (isDevMode() && fn != null && typeof fn !== 'function' && <any>console && <any>console.warn)
      console.warn(`trackBy must be a function, but received ${JSON.stringify(fn)}.`);

    this._trackByFn = fn;
  }

  @Input('infiniteForTemplate')
  set template(value: TemplateRef<InfiniteRow>) {
    if (value)
      this._template = value;
  }

  @Input('infiniteForHeightFn') heightFn!: (index: number) => number;

  @Input('infiniteForLimit') limit = 8;

  @Input('infiniteForOnScrollEnd') scrollEnd!: () => void;

  private _scrollY!: number;

  private _differ!: IterableDiffer<T>;
  private _trackByFn!: TrackByFunction<T>;
  private _subscription: Subscription = new Subscription();

  private _collection!: any[];
  private _heights: number[] = [];

  private _firstItemPosition!: number;
  private _lastItemPosition!: number;

  private _containerWidth!: number;
  private _containerHeight!: number;

  private _isInLayout: boolean = false;
  private _isInMeasure: boolean = false;
  private _invalidate: boolean = true;

  private _pendingMeasurement!: number;
  private _loading = false;

  private _recycler = new Recycler();


  constructor(
    private _infiniteList: RecyclerViewComponent,
    private _differs: IterableDiffers,
    private _template: TemplateRef<InfiniteRow>,
    private _viewContainerRef: ViewContainerRef,
    private _renderer: Renderer2,
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('data' in changes)) return;

    const value = changes['data'].currentValue;
    if (this._differ || !value) return;

    try {
      this._differ = this._differs.find(value).create(this._trackByFn);
    } catch (e) {
      throw new Error(`Cannot find a differ supporting object '${value}' of this type. NgFor only supports binding to Iterables such as Arrays.`);
    }
  }

  ngDoCheck(): void {
    if (!this._differ) return;

    const changes = this._differ.diff(this.data);
    if (!changes) return;

    this.applyChanges(changes);
  }

  ngOnInit(): void {
    this._subscription.add(
      this._infiniteList.scrollPosition
        .subscribe((scrollY) => {
          this._scrollY = scrollY;
          this.requestLayout();
        })
    );

    this._subscription.add(
      this._infiniteList.sizeChange.subscribe(([width, height]) => {
        this._containerWidth = width;
        this._containerHeight = height;
        this.requestMeasure();
      })
    );
  }

  ngOnDestroy(): void {
    this._subscription.unsubscribe();
    this._recycler.clean();
  }

  private applyChanges(changes: IterableChanges<T>) {
    if (!this._collection)
      this._collection = [];

    let isMeasurementRequired = false;

    changes.forEachOperation((item, adjustedPreviousIndex, currentIndex) => {
      if (item.previousIndex == null) {
        isMeasurementRequired = true;
        this._collection.splice(currentIndex || 0, 0, item.item);
      } else if (currentIndex == null) {
        isMeasurementRequired = true;
        this._collection.splice(adjustedPreviousIndex || 0, 1);
      } else {
        this._collection.splice(currentIndex, 0, this._collection.splice(adjustedPreviousIndex || 0, 1)[0]);
      }
    });

    changes.forEachIdentityChange((record: any) => {
      this._collection[record.currentIndex] = record.item;
    });

    for (let i = 0; i < this._collection.length; i++) {
      this._heights[i] = this.heightFn(this._collection[i]);
      isMeasurementRequired = true;
    }

    this._loading = false;

    if (isMeasurementRequired)
      this.requestMeasure();

    this.requestLayout();
  }

  private requestMeasure() {
    if (this._isInMeasure || this._isInLayout) {
      clearTimeout(this._pendingMeasurement);
      this._pendingMeasurement =
        window.setTimeout(() => this.requestMeasure(), 60);
      return;
    }
    this.measure();
  }

  private requestLayout() {
    if (!this._isInMeasure && this._heights && this._heights.length !== 0)
      this.layout();
  }

  private measure() {
    this._isInMeasure = true;

    this.calculateScrapViewsLimit();
    this._isInMeasure = false;
    this._invalidate = true;
    this.requestLayout();
  }

  private layout() {
    if (this._isInLayout) return;

    this._isInLayout = true;
    let { width, height } = this._infiniteList.measure();
    this._containerWidth = width;
    this._containerHeight = height;

    if (!this._collection || this._collection.length === 0) {
      for (let i = 0; i < this._viewContainerRef.length; i++) {
        this._viewContainerRef.detach(i);
        i--;
      }
      this._isInLayout = false;
      this._invalidate = false;
      return;
    }
    this.findPositionInRange();

    for (let i = 0; i < this._viewContainerRef.length; i++) {
      let child = <EmbeddedViewRef<InfiniteRow>>this._viewContainerRef.get(i);
      this._viewContainerRef.detach(i);
      this._recycler.recycleView(child.context.index, child);
      i--;
    }

    this.insertViews();
    this._recycler.pruneScrapViews();
    this._isInLayout = false;
    this._invalidate = false;
  }

  insertViews() {
    if (this._lastItemPosition >= this._collection.length - 1 && !this._loading) {
      this._loading = true;
      this.scrollEnd();
    }

    if (this._viewContainerRef.length > 0) {
      let firstChild = <EmbeddedViewRef<InfiniteRow>>this._viewContainerRef.get(0);
      let lastChild = <EmbeddedViewRef<InfiniteRow>>this._viewContainerRef.get(this._viewContainerRef.length - 1);
      for (let i = firstChild.context.index - 1; i >= this._firstItemPosition; i--) {
        let view = this.getView(i);
        this.dispatchLayout(i, view, true);
      }
      for (let i = lastChild.context.index + 1; i <= this._lastItemPosition; i++) {
        let view = this.getView(i);
        this.dispatchLayout(i, view, false);
      }
    } else {
      for (let i = this._firstItemPosition; i <= this._lastItemPosition; i++) {
        let view = this.getView(i);
        this.dispatchLayout(i, view, false);
      }
    }
    // ! the paddings are messing with the performance?
    // TODO: can do sth that we get smooth dynamic heighting?
    this._renderer.setStyle(this._infiniteList.listHolder.nativeElement, 'padding-top', `${sum(this._heights.slice(0, this._firstItemPosition))}px`);
    this._renderer.setStyle(this._infiniteList.listHolder.nativeElement, 'padding-bottom', `${sum(this._heights.slice(this._firstItemPosition, this._heights.length)) - this._containerHeight}px`);
  }

  findPositionInRange() {
    let endIndexChanged = false;

    let sum = 0;
    for (let i = 0; i < this._heights.length; i++) {
      if (sum >= this._scrollY) {
        this._firstItemPosition = i;
        break;
      }
      sum += this.heightFn(i);
    }

    for (let i = this._firstItemPosition; i < this._heights.length; i++) {
      if (sum >= this._scrollY + this._containerHeight) {
        this._lastItemPosition = i;
        endIndexChanged = true;
        break;
      }
      sum += this.heightFn(i);
    }

    if (!endIndexChanged && this._firstItemPosition != 0)
      this._lastItemPosition = this._collection.length - 1;

    if (this._scrollY < this._heights[0])
      this._firstItemPosition = 0;

    this._firstItemPosition = Math.max(this._firstItemPosition - 1, 0);
    this._lastItemPosition = Math.min(this._lastItemPosition + 1, this._collection.length - 1);
  }

  private getView(position: number): ViewRef {
    let view = this._recycler.getView(position);
    let item = this._collection[position];
    let count = this._collection.length;
    if (!view)
      view = this._template.createEmbeddedView(new InfiniteRow(item, position, count));
    else {
      (view as EmbeddedViewRef<InfiniteRow>).context.$implicit = item;
      (view as EmbeddedViewRef<InfiniteRow>).context.index = position;
      (view as EmbeddedViewRef<InfiniteRow>).context.count = count;
    }
    return view;
  }

  private dispatchLayout(position: number, view: ViewRef, addBefore: boolean) {
    // (view as EmbeddedViewRef<InfiniteRow>).rootNodes[0].style.height = `${this._heights[position]}px`;
    if (addBefore)
      this._viewContainerRef.insert(view, 0);
    else
      this._viewContainerRef.insert(view);

    view.reattach();
  }

  private calculateScrapViewsLimit() {
    this._recycler.setScrapViewsLimit(this.limit);
  }
}
