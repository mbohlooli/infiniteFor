import { AfterViewInit, Directive, ElementRef, EmbeddedViewRef, HostListener, Input, OnInit, Renderer2, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { WindowScrollingService } from './services/window-scrolling.service';


//TODO: we can use a function to get the height of each element
@Directive({
  selector: '[infiniteScroll]'
})
export class InfiniteScrollDirective implements AfterViewInit, OnInit {
  @Input('viewport') viewport!: ElementRef;
  @Input('listHolder') listHolder!: ElementRef;
  @Input('scrollContainer') scrollContainer!: ViewContainerRef;
  @Input('listItem') listItem!: TemplateRef<any>;
  @Input('items') items: number[] = [];
  @Input('viewportHeight') viewportHeight: number = 611;

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

  ngOnInit(): void {
    console.log(this.heights);
    for (let i = 0; i < this.items.length; i++)
      this.heights[i] = Math.random() * 200 + 25;
    const scrollTop = 0;
    this.totalPadding = this.sum(this.heights) - this.viewportHeight;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    // ! Calculate this.previousEndIndex
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
      view.rootNodes[0].style.transform = `translate3d(0, ${this.sum(this.heights.slice(this.previousStartIndex, this.previousStartIndex + i))}px, 0)`;
      view.rootNodes[0].style.height = `${this.heights[i]}px`;
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
    if (scrollTop > this.totalPadding) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    let { startIndex, endIndex } = this.getVisibleRange(scrollTop);


    console.log('new positions', startIndex, endIndex);
    console.log('old positions', this.previousStartIndex, this.previousEndIndex);
    console.log('scrollTop', scrollTop);
    if (endIndex >= this.items.length - 1 && !this.loading)
      this.loadMoreItems();

    const fastScroll = this.previousEndIndex < startIndex || this.previousStartIndex > endIndex;
    const scrollDown = this.previousStartIndex <= startIndex;
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
      if (this.sum(this.heights.slice(0, i + 1)) >= scrollTop + this.viewport.nativeElement.offsetHeight) {
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
    let view = this.map.get(index);
    if (!view) {
      view = this.listItem.createEmbeddedView({ index });
      this.map.set(index, view);
    }
    (view as EmbeddedViewRef<any>).rootNodes[0].style.height = `${this.heights[index]}px`;
    if (index == 0)
      (view as EmbeddedViewRef<any>).rootNodes[0].style.backgroundColor = `red`;
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
    console.log('loading more items...');

    //TODO: fix the tiny jump
    setTimeout(() => {
      let addedHeight = 0;
      for (let i = 0; i < 20; i++) {
        this.items.push(this.items.length + i);
        let newHeight = Math.random() * 200 + 25;
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
