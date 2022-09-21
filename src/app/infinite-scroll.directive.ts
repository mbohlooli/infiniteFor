import {
  AfterViewInit,
  Directive,
  DoCheck,
  ElementRef,
  EmbeddedViewRef,
  EventEmitter,
  Input,
  IterableDiffer,
  IterableDiffers,
  NgIterable,
  OnChanges,
  OnDestroy, Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  TrackByFunction,
  ViewContainerRef
} from '@angular/core';
import { Recycler } from './recycler';
import { WindowScrollingService } from './services/window-scrolling.service';


@Directive({
  selector: '[behkhaanInfiniteScroll][behkhaanInfiniteScrollOf]'
})
export class BehkhaanInfiniteScrollDirective implements AfterViewInit, OnDestroy, OnChanges, DoCheck {
  //TODO: get this from somewhere else
  @Input('behkhaanInfiniteScrollListHolder') listHolder!: ElementRef;
  @Input('behkhaanInfiniteScrollOf') data!: NgIterable<any>;
  items: number[] = [];
  @Input('behkhaanInfiniteScrollHeight') heightFn!: (item: any) => number;
  @Input('behkhaanInfiniteScrollTrackBy') trackByFn!: TrackByFunction<any>;
  @Input('behkhaanInfiniteScrollMarginalItemsToRender') marginalItemsToRender!: number;

  @Output('scrollEnd') scrollEndEvent = new EventEmitter<any>();

  viewportHeight: number = 611;
  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  previousStartIndex = 0;
  previousEndIndex = 0;
  loading: boolean = false;
  initialized: boolean = false;
  previousScrollTop: number = 0;
  heights: number[] = [];
  recycler: Recycler = new Recycler();
  differ!: IterableDiffer<any>;
  firstChange = true;

  constructor(
    private renderer: Renderer2,
    private windowScrollingService: WindowScrollingService,
    private differs: IterableDiffers,
    private listItem: TemplateRef<any>,
    private scrollContainer: ViewContainerRef
  ) {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!('data' in changes)) return;

    this.viewportHeight = this.listHolder.nativeElement.getBoundingClientRect().height;

    const value = changes['data'].currentValue;
    if (this.differ || !value) return;

    try {
      this.differ = this.differs.find(value).create(this.trackByFn);
    } catch (e) {
      throw new Error('Error in scrolling.');
    }
  }

  ngDoCheck(): void {
    if (!this.differ) return;

    const changes = this.differ.diff(this.data);
    if (!changes) return;
    this.loading = false;
    changes.forEachAddedItem(item => {
      this.items.push(item.item);
      if (item.currentIndex != null)
        this.heights.push(this.heightFn(item.item));
    });

    this.totalPadding = this.sum(this.heights) - this.viewportHeight;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    let { startIndex, endIndex } = this.getVisibleRange(this.paddingTop);


    for (let i = this.previousEndIndex; i <= endIndex; i++) {
      let view = this.getView(i);
      this.scrollContainer.insert(view);
      view.reattach();
    }
    this.scrollTo(this.paddingTop)
    if (this.firstChange) {
      for (let i = this.scrollContainer.length - 1; i >= 0; i--) {
        let child = this.scrollContainer.get(i) as EmbeddedViewRef<any>;
        this.scrollContainer.detach(i);
        this.recycler.recycleView(child.context.index, child);
      }
      for (let i = startIndex; i <= endIndex; i++) {
        let view = this.getView(i);
        this.scrollContainer.insert(view);
        view.reattach();
      }
    }
    // this.setPaddings();
    // this.placeViews(this.paddingTop);
    this.firstChange = false;
  }

  ngAfterViewInit() {
    this.windowScrollingService.scrollY.subscribe(this.scrollTo);
  }

  scrollTo = (scrollTop: number) => {
    if (!scrollTop) return;
    if (scrollTop > this.totalPadding) return;

    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    let { startIndex, endIndex } = this.getVisibleRange(scrollTop);

    if (endIndex >= this.items.length - 1 && !this.loading) {
      this.scrollEndEvent.emit();
      this.loading = true;
    }

    const fastScroll = this.previousEndIndex <= startIndex || this.previousStartIndex >= endIndex;
    const scrollDown = this.previousStartIndex <= startIndex;
    const scrollUp = this.previousStartIndex >= startIndex;

    if (fastScroll) {
      // ? Is the delete and insert all better?
      for (let i = this.scrollContainer.length - 1; i >= 0; i--) {
        let child = this.scrollContainer.get(i) as EmbeddedViewRef<any>;
        this.scrollContainer.detach(i);
        this.recycler.recycleView(child.context.index, child);
      }
      for (let i = startIndex; i <= endIndex; i++) {
        let view = this.getView(i);
        this.scrollContainer.insert(view);
        view.reattach();
      }
    } else if (scrollDown) {
      for (let i = this.previousStartIndex; i < startIndex; i++) {
        let child = this.scrollContainer.get(i - this.previousStartIndex) as EmbeddedViewRef<any>;
        this.scrollContainer.detach(i - this.previousStartIndex);
        this.recycler.recycleView(child.context.index, child);
      }
      for (let i = this.previousEndIndex + 1; i <= endIndex; i++) {
        let view = this.getView(i);
        this.scrollContainer.insert(view);
        view.reattach();
      }
    } else if (scrollUp) {
      for (let i = this.previousStartIndex - 1; i >= startIndex; i--) {
        let view = this.getView(i);
        this.scrollContainer.insert(view, 0);
        view.reattach();
      }
      for (let i = endIndex + 1; i <= startIndex + this.scrollContainer.length - 1; i++) {
        let child = this.scrollContainer.get(i - startIndex) as EmbeddedViewRef<any>;
        this.scrollContainer.detach(i - startIndex);
        this.recycler.recycleView(child.context.index, child);
      }
    }
    this.placeViews(scrollTop);

    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
    this.previousScrollTop = scrollTop;
  }

  getVisibleRange(scrollTop: number) {
    let startIndex = this.findFirstGreaterOrEqual(scrollTop, 0, this.heights.length - 1);
    startIndex = Math.max(0, startIndex - this.marginalItemsToRender);
    let endIndex = this.findFirstGreaterOrEqual(scrollTop + this.viewportHeight, startIndex, this.heights.length - 1);
    endIndex = Math.min(endIndex + this.marginalItemsToRender, this.items.length - 1);
    return { startIndex, endIndex };
  }

  placeViews(scrollTop: number) {
    let { startIndex } = this.getVisibleRange(scrollTop);
    // ! jumps!!!
    this.paddingTop -= scrollTop - this.sum(this.heights.slice(0, startIndex));
    this.setPaddings();
  }

  setPaddings() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
  }

  getPositionOnScreen(position: number, scrollTop: number): string {
    return `translate3d(0, ${this.heights[position] - (scrollTop % this.heights[position])}px, 0)`;
  }

  getView(index: number): EmbeddedViewRef<any> {
    let view = this.recycler.getView(index);
    let item = this.items[index];
    if (!view) {
      view = this.listItem.createEmbeddedView({ $implicit: item, index });
    } else {
      (view as EmbeddedViewRef<any>).context.$implicit = item;
      (view as EmbeddedViewRef<any>).context.index = index;
    }
    (view as EmbeddedViewRef<any>).rootNodes[0].style.height = `${this.heights[index]}px`;
    return view as EmbeddedViewRef<any>;
  }

  getScrollContainerItemAt(index: number) {
    return this.scrollContainer.get(index) as EmbeddedViewRef<any>;
  }

  placeScrollItemAt(originalIndex: number, indexToPut: number, scrollTop: number): any {
    this.getScrollContainerItemAt(originalIndex).rootNodes[0].style.transform =
      this.getPositionOnScreen(indexToPut, scrollTop);
  }

  sum(numbers: number[]) {
    let result = 0;
    for (let i = 0; i < numbers.length; i++)
      result += numbers[i];
    return result;
  }

  findFirstGreaterOrEqual(value: number, start: number, end: number): number {
    if (start > end) return end;

    let mid = Math.floor((start + end) / 2);
    if (mid == 0) return 0;

    if (this.sum(this.heights.slice(0, mid - 1)) < value && this.sum(this.heights.slice(0, mid)) >= value) return mid;

    if (this.sum(this.heights.slice(0, mid)) > value)
      return this.findFirstGreaterOrEqual(value, start, mid - 1);

    return this.findFirstGreaterOrEqual(value, mid + 1, end);
  }

  ngOnDestroy(): void {
    this.windowScrollingService.scrollY.unsubscribe();
  }
}
