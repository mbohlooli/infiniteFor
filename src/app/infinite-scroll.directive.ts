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
  OnDestroy,
  OnInit,
  Output,
  Renderer2,
  SimpleChanges,
  TemplateRef,
  TrackByFunction,
  ViewContainerRef
} from '@angular/core';
import { Recycler } from './recycler';
import { WindowScrollingService } from './services/window-scrolling.service';


@Directive({
  selector: '[infiniteScroll][infiniteScrollOf]'
})
export class InfiniteScrollDirective implements AfterViewInit, OnDestroy, OnChanges, DoCheck {
  //TODO: get this from somewhere else
  @Input('infiniteScrollListHolder') listHolder!: ElementRef;
  @Input('infiniteScrollOf') data!: NgIterable<any>;
  items: number[] = [];
  @Input('infiniteScrollHeight') heightFn!: (item: any) => number;
  @Input('infiniteScrollTrackBy') trackByFn!: TrackByFunction<any>;

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
    // ! End index ...
    console.log(startIndex, endIndex, this.viewportHeight);
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
    this.placeViews(this.paddingTop);
    this.setPaddings();
    console.log('check ended');
  }

  ngAfterViewInit() {
    this.windowScrollingService.scrollY.subscribe(this.scrollTo);
  }

  scrollTo = (scrollTop: number) => {
    console.log('calling scroll To');

    if (!scrollTop) return;
    if (scrollTop > this.totalPadding) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    this.setPaddings();

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
    console.log(this.items);
    this.placeViews(scrollTop);
    // this.setPaddings();

    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
    this.previousScrollTop = scrollTop;
  }

  getVisibleRange(scrollTop: number) {
    // if (!scrollTop)
    //   return { startIndex: this.previousStartIndex, endIndex: this.previousEndIndex };
    let startIndex = this.binarySearch(scrollTop - 100, 0, this.heights.length - 1);
    let endIndex = this.binarySearch(scrollTop + this.viewportHeight + 100, startIndex, this.heights.length - 1);
    console.log(startIndex, endIndex);
    return { startIndex, endIndex };
    // let startIndex = 0;
    // let endIndex = 0;
    // let endIndexChanged = false;

    // for (let i = 0; i < this.heights.length; i++)
    //   if (this.sum(this.heights.slice(0, i + 1)) >= scrollTop) {
    //     startIndex = i;
    //     break;
    //   }

    // for (let i = 0; i < this.heights.length; i++)
    //   if (this.sum(this.heights.slice(0, i + 1)) >= scrollTop + this.viewportHeight) {
    //     endIndex = i;
    //     endIndexChanged = true;
    //     break;
    //   }

    // if (!endIndexChanged)
    //   endIndex = this.items.length - 1;
    // if (scrollTop < this.heights[0])
    //   startIndex = 0;
    // return { startIndex, endIndex };
  }

  placeViews(scrollTop: number) {
    let { startIndex } = this.getVisibleRange(scrollTop);
    let remainder = scrollTop - this.sum(this.heights.slice(0, startIndex));
    // let pos = -remainder;
    this.paddingTop -= remainder;
    this.setPaddings();
    // for (let i = 0; i < this.scrollContainer.length; i++) {
    //   this.getScrollContainerItemAt(i).rootNodes[0].style.transform = `translate3d(0, ${pos}px, 0)`;
    //   pos += parseFloat(this.getScrollContainerItemAt(i).rootNodes[0].style.height.slice(0, -2));
    // }
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

  binarySearch(value: number, start: number, end: number): number {
    if (start > end) return end;

    let mid = Math.floor((start + end) / 2);
    if (mid == 0) return 0;

    if (this.sum(this.heights.slice(0, mid - 1)) < value && this.sum(this.heights.slice(0, mid)) >= value) return mid;

    if (this.sum(this.heights.slice(0, mid)) > value)
      return this.binarySearch(value, start, mid - 1);

    return this.binarySearch(value, mid + 1, end);
  }

  ngOnDestroy(): void {
    this.windowScrollingService.scrollY.unsubscribe();
  }
}
