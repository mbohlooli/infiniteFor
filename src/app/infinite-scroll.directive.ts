import { AfterViewInit, Directive, ElementRef, EmbeddedViewRef, HostListener, Input, OnInit, Renderer2, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { Recycler } from './recycler';
import { WindowScrollingService } from './services/window-scrolling.service';


//TODO: we can use a function to get the height of each element
@Directive({
  selector: '[infiniteScroll][infiniteScrollOf]'
})
export class InfiniteScrollDirective implements AfterViewInit, OnInit {
  //TODO: get this from somewhere else
  @Input('infiniteScrollListHolder') listHolder!: ElementRef;
  @Input('infiniteScrollOf') items: number[] = [];
  //TODO: make this dynamic
  @Input('infiniteScrollViewportHeight') viewportHeight: number = 611;
  @Input('infiniteScrollHeight') heightFn!: (index: number) => number;
  @Input('infiniteScrollLoadMore') loadMoreFn!: () => void;

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

  constructor(
    private renderer: Renderer2,
    private windowScrollingService: WindowScrollingService,
    private listItem: TemplateRef<any>,
    private scrollContainer: ViewContainerRef
  ) { }

  ngOnInit(): void {
    console.log(this.heights);
    for (let i = 0; i < this.items.length; i++)
      this.heights[i] = this.heightFn(i);
    // this.heights[i] = Math.random() * 200 + 25;
    const scrollTop = 0;
    this.totalPadding = this.sum(this.heights) - this.viewportHeight;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    for (let i = 0; i < this.heights.length; i++)
      if (this.sum(this.heights.slice(0, i)) >= this.viewportHeight) {
        this.previousEndIndex = i;
        break;
      }

  }

  ngAfterViewInit() {
    this.setPaddings();
    for (let i = this.previousStartIndex; i <= this.previousEndIndex; i++) {
      let view = this.getView(i);
      this.scrollContainer.insert(view);
      view.reattach();
    }
    this.placeViews(0);
    this.windowScrollingService.scrollY$.subscribe(this.scrollTo);
  }

  scrollTo = (scrollTop: number) => {
    if (!scrollTop) return;
    if (scrollTop > this.totalPadding) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    let { startIndex, endIndex } = this.getVisibleRange(scrollTop);


    // console.log('new positions', startIndex, endIndex);
    // console.log('old positions', this.previousStartIndex, this.previousEndIndex);
    // console.log('scrollTop', scrollTop);
    if (endIndex >= this.items.length - 1 && !this.loading)
      this.loadMoreItems();

    const fastScroll = this.previousEndIndex <= startIndex || this.previousStartIndex >= endIndex;
    const scrollDown = this.previousStartIndex <= startIndex;
    const scrollUp = this.previousStartIndex >= startIndex;

    if (fastScroll) {
      // ! Fix the fast scrolling when scrolling all the way to the top
      // ! Fast scroll doesn't insert the correct items
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
      if (this.loading) return;
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
    this.setPaddings();

    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
    this.previousScrollTop = scrollTop;
  }

  getVisibleRange(scrollTop: number) {
    if (!scrollTop)
      return { startIndex: this.previousStartIndex, endIndex: this.previousEndIndex };

    let startIndex = 0;
    let endIndex = 0;
    let endIndexChanged = false;

    for (let i = 0; i < this.heights.length; i++)
      if (this.sum(this.heights.slice(0, i + 1)) >= scrollTop) {
        startIndex = i;
        break;
      }

    for (let i = 0; i < this.heights.length; i++)
      if (this.sum(this.heights.slice(0, i + 1)) >= scrollTop + this.viewportHeight) {
        endIndex = i;
        endIndexChanged = true;
        break;
      }

    if (!endIndexChanged)
      endIndex = this.items.length - 1;
    if (scrollTop < this.heights[0])
      startIndex = 0;
    return { startIndex, endIndex };
  }

  placeViews(scrollTop: number) {
    let { startIndex } = this.getVisibleRange(scrollTop);
    let remainder = scrollTop - this.sum(this.heights.slice(0, startIndex));
    let pos = -remainder;
    for (let i = 0; i < this.scrollContainer.length; i++) {
      this.getScrollContainerItemAt(i).rootNodes[0].style.transform = `translate3d(0, ${pos}px, 0)`;
      pos += parseFloat(this.getScrollContainerItemAt(i).rootNodes[0].style.height.slice(0, -2));
    }
  }

  setPaddings() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
  }

  getPositionOnScreen(position: number, scrollTop: number): string {
    return `translate3d(0, ${this.heights[position] - (scrollTop % this.heights[position])}px, 0)`;
  }

  getView(index: number): EmbeddedViewRef<any> {
    //TODO: change the bindings an do the actual recycling
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
    // let view = this.map.get(index);
    // if (!view) {
    //   view = this.listItem.createEmbeddedView({ $implicit: this.items[index], index });
    //   this.map.set(index, view);
    // }
    // (view as EmbeddedViewRef<any>).rootNodes[0].style.height = `${this.heights[index]}px`;
    // if (index == 0)
    //   (view as EmbeddedViewRef<any>).rootNodes[0].style.backgroundColor = `red`;
    // return view as EmbeddedViewRef<any>;
  }

  getScrollContainerItemAt(index: number) {
    return this.scrollContainer.get(index) as EmbeddedViewRef<any>;
  }

  placeScrollItemAt(originalIndex: number, indexToPut: number, scrollTop: number): any {
    this.getScrollContainerItemAt(originalIndex).rootNodes[0].style.transform =
      this.getPositionOnScreen(indexToPut, scrollTop);
  }

  // TODO: Make this an event that parent responds to
  loadMoreItems() {
    this.loadMoreFn();
    this.loading = true;
    console.log('loading more items...');

    //TODO: fix the tiny jump
    setTimeout(() => {
      let addedHeight = 0;
      for (let i = 0; i < 20; i++) {
        this.items.push(this.items.length + i);
        let newHeight = this.heightFn(this.items.length + i);
        addedHeight += newHeight;
        this.heights.push(newHeight);
      }
      this.totalPadding += addedHeight
      this.paddingBottom += addedHeight;
      this.setPaddings();
      this.loading = false;
    }, 2000);
  }

  sum(numbers: number[]) {
    let result = 0;
    for (let i = 0; i < numbers.length; i++)
      result += numbers[i];
    return result;
  }
}
