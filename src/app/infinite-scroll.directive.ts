import { AfterViewInit, Directive, ElementRef, EmbeddedViewRef, HostListener, Input, OnChanges, OnInit, Renderer2, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';
import { WindowScrollingService } from './services/window-scrolling.service';
import { Observable } from 'rxjs';


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
  @Input('rowHeight') rowHeight: number = 200;
  @Input('viewportHeight') viewportHeight: number = 500;

  totalPadding: number = 0;
  paddingBottom: number = 0;
  paddingTop: number = 0;
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);
  map: Map<number, ViewRef> = new Map();
  loading: boolean = false;
  initialized: boolean = false;
  previousScrollTop: number = 0;

  constructor(
    private renderer: Renderer2,
    private windowScrollingService: WindowScrollingService
  ) { }

  ngOnChanges(changes: SimpleChanges): void {
    const scrollTop = 0;
    this.totalPadding = this.items.length * this.rowHeight - this.viewportHeight;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    for (let i = this.previousStartIndex; i <= this.previousEndIndex; i++) {
      let view = this.getView(i);
      view.rootNodes[0].style.transform = `translate3d(0, ${i * this.rowHeight}px, 0)`;
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
    if (endIndex >= this.items.length && !this.loading) {
      console.log('loading more items...');
      this.loading = true;
    }

    const fastScroll = this.previousEndIndex < startIndex || this.previousStartIndex > endIndex;
    if (fastScroll) {
      for (let i = 0; i < this.scrollContainer.length; i++)
        this.scrollContainer.detach(i);
      for (let i = startIndex; i <= endIndex; i++) {
        let view = this.getView(i);
        view.rootNodes[0].style.transform = this.getPositionOnScreen(i - startIndex, scrollTop);
        this.scrollContainer.insert(view);
        view.reattach();
      }
    } else {
      const scrollDown = this.previousStartIndex < startIndex;
      const scrollUp = this.previousStartIndex > startIndex;
      //TODO: store the previous scroll
      //TODO: use the behaviour subject for this scrolling
      //TODO: step_1)window scroll service
      if (scrollDown) {
        //! what if user scrolles to end and trigger this
        //! then scroll top
        //! then scroll down
        //! booom!
        if (this.loading) return;
        for (let i = this.previousStartIndex; i < startIndex; i++)
          this.scrollContainer.detach(i - this.previousStartIndex);
        for (let i = startIndex; i < this.previousEndIndex; i++)
          this.placeScrollItemAt(i - startIndex, i - startIndex, scrollTop);
        for (let i = this.previousEndIndex; i <= endIndex; i++) {
          let view = this.getView(i);
          view.rootNodes[0].style.transform = this.getPositionOnScreen(i - startIndex, scrollTop);
          this.scrollContainer.insert(view);
          view.reattach();
        }
      } else if (scrollUp) {
        //! The problem is that is doesnt delete some items probably from bottom
        //TODO: set some id or sth on the divs and then see if the i detach
        if (this.loading) this.loading = false;
        for (let i = endIndex + 1; i <= this.previousEndIndex; i++)
          this.scrollContainer.detach(i - this.previousStartIndex);
        for (let i = this.previousStartIndex; i <= endIndex; i++)
          this.placeScrollItemAt(i - this.previousStartIndex, i - this.previousStartIndex, scrollTop);
        for (let i = startIndex; i < this.previousStartIndex; i++) {
          let view = this.getView(i);
          view.rootNodes[0].style.transform = this.getPositionOnScreen(i - startIndex, scrollTop);
          this.scrollContainer.insert(view, 0);
          view.reattach();
        }
      } else
        for (let i = 0; i < this.scrollContainer.length; i++)
          this.placeScrollItemAt(i, i, scrollTop);
    }


    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
    this.previousScrollTop = scrollTop;
  }

  getVisibleRange(scrollTop: number) {
    if (!scrollTop) return { startIndex: this.previousStartIndex, endIndex: this.previousEndIndex };

    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);
    return { startIndex, endIndex };
  }

  getPositionOnScreen(position: number, scrollTop: number): string {
    return `translate3d(0, ${position * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`
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
}
