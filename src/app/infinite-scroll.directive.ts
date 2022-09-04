import { AfterViewInit, Directive, ElementRef, EmbeddedViewRef, HostListener, Input, OnChanges, Renderer2, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { WindowScrollingService } from './services/window-scrolling.service';


//TODO: we can use a function to get the height of each element
@Directive({
  selector: '[infiniteScroll]'
})
export class InfiniteScrollDirective implements AfterViewInit, OnChanges {
  @Input('viewport') viewport!: ElementRef;
  @Input('listHolder') listHolder!: ElementRef;
  @Input('scrollContainer') scrollContainer!: ViewContainerRef;
  @Input('listItem') listItem!: TemplateRef<any>;
  @Input('items') items: number[] = [];
  // @Input('rowHeight') rowHeight: number = 200;
  @Input('viewportHeight') viewportHeight: number = 500;

  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  previousStartIndex = 0;
  previousEndIndex = 0;
  map: Map<number, ViewRef> = new Map();
  loading: boolean = false;
  initialized: boolean = false;
  previousScrollTop: number = 0;
  heights: number[] = [];

  constructor(
    private renderer: Renderer2,
    private windowScrollingService: WindowScrollingService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    for (let i = 0; i < this.items.length; i++) {
      let previousHeight = this.heights[i - 1];
      this.heights[i] = Math.random() * 200 + 25 + (previousHeight ? previousHeight : 0);
    }
    const scrollTop = 0;
    this.totalPadding = this.heights[this.heights.length - 1] - this.viewportHeight;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    // ! Calculate this.previousEndIndex
    // if (changes['viewport']) {
    //   let viewportHeight = changes['viewport'].currentValue?.nativeElement.height;
    //   if (viewportHeight) {
    for (let i = 0; i < this.heights.length; i++) {
      if (this.heights[i] < scrollTop + 610) {
        this.previousEndIndex = i;
        break;
      }
    }
    //   }
    // }
  }

  ngAfterViewInit() {
    this.setPaddings();
    for (let i = this.previousStartIndex; i <= 10; i++) {
      let view = this.getView(i);
      view.rootNodes[0].style.transform = `translate3d(0, ${this.heights[i - 1] ? this.heights[i - 1] : 0}px, 0)`;
      view.rootNodes[0].style.height = `${this.heights[i] - (this.heights[i - 1] ? this.heights[i - 1] : 0)}px  `;
      this.scrollContainer.insert(view);
      view.reattach();
    }
    this.windowScrollingService.scrollY$.subscribe(this.scrollTo);
  }

  @HostListener('scroll') onScroll() {
    this.windowScrollingService.scrollY.next(this.viewport.nativeElement.scrollTop);
  }

  scrollTo = (scrollTop: number) => {
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    let { startIndex, endIndex } = this.getVisibleRange(scrollTop);


    console.log(startIndex, endIndex);
    console.log('old positions', this.previousStartIndex, this.previousEndIndex);
    console.log('scrollTop', scrollTop);
    if (endIndex >= this.items.length && !this.loading)
      this.loadMoreItems();

    const fastScroll = this.previousEndIndex < startIndex || this.previousStartIndex > endIndex;
    const scrollDown = this.previousStartIndex < startIndex;
    const scrollUp = this.previousStartIndex > startIndex;

    if (fastScroll) {
      // ! Fix the fast scrolling when scrolling all the way to the top
      for (let i = 0; i < this.scrollContainer.length; i++)
        this.scrollContainer.detach(i);
      for (let i = startIndex; i <= endIndex; i++) {
        let view = this.getView(i);
        this.scrollContainer.insert(view);
        view.reattach();
      }
    } else if (scrollDown) {
      if (this.loading) return;
      for (let i = this.previousStartIndex; i < startIndex; i++)
        this.scrollContainer.detach(i - this.previousStartIndex);
      for (let i = this.previousEndIndex; i <= endIndex; i++) {
        let view = this.getView(i);
        this.scrollContainer.insert(view);
        view.reattach();
      }
    } else if (scrollUp) {
      for (let i = startIndex; i < this.previousStartIndex; i++) {
        let view = this.getView(i);
        this.scrollContainer.insert(view, 0);
        view.reattach();
      }
      for (let i = endIndex + 1; i <= startIndex + this.scrollContainer.length - 1; i++)
        this.scrollContainer.detach(i - startIndex);
    }

    this.placeViews(scrollTop);
    this.setPaddings();

    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
    this.previousScrollTop = scrollTop;
  }

  getVisibleRange(scrollTop: number) {
    if (!scrollTop) return { startIndex: this.previousStartIndex, endIndex: this.previousEndIndex };
    let startIndex = 0;
    let endIndex = 0;
    for (let i = 0; i < this.heights.length; i++) {
      if (this.heights[i] < scrollTop) {
        startIndex = i;
        break;
      }
    }
    for (let i = 0; i < this.heights.length; i++) {
      if (this.heights[i] < scrollTop + this.viewport.nativeElement.height) {
        endIndex = i;
        break;
      }
    }
    // let startIndex = Math.floor(scrollTop / this.rowHeight);
    // let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);
    return { startIndex, endIndex };
  }

  placeViews(scrollTop: number) {
    for (let i = 0; i < this.scrollContainer.length; i++)
      this.placeScrollItemAt(i, i, scrollTop);
  }

  setPaddings() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
  }

  getPositionOnScreen(position: number, scrollTop: number): string {
    return `translate3d(0, ${this.heights[position] - (scrollTop % this.heights[position])}px, 0)`
  }

  getView(index: number): EmbeddedViewRef<any> {
    let view = this.map.get(index);
    if (!view) {
      view = this.listItem.createEmbeddedView({ index });
      this.map.set(index, view);
    }
    return view as EmbeddedViewRef<any>;
  }

  getScrollContainerItemAt(index: number) {
    return this.scrollContainer.get(index) as EmbeddedViewRef<any>;
  }

  placeScrollItemAt(originalIndex: number, indexToPut: number, scrollTop: number): any {
    this.getScrollContainerItemAt(originalIndex).rootNodes[0].style.transform =
      this.getPositionOnScreen(indexToPut, scrollTop);
  }

  loadMoreItems() {
    this.loading = true;
    //TODO: fix the tiny jump
    // setTimeout(() => {
    //   for (let i = 0; i < 20; i++)
    //     this.items.push(this.items.length + i);
    //   this.totalPadding += 20 * this.rowHeight;
    //   this.paddingBottom += 20 * this.rowHeight;
    //   this.setPaddings();
    //   this.loading = false;
    // }, 2000);
  }
}
