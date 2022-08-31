import { AfterViewInit, Directive, ElementRef, EmbeddedViewRef, HostListener, Input, OnChanges, OnInit, Renderer2, SimpleChanges, TemplateRef, ViewContainerRef, ViewRef } from '@angular/core';

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

  constructor(private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges): void {
    const scrollTop = 0;
    this.totalPadding = (this.items.length - 3) * this.rowHeight;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    for (let i = this.previousStartIndex; i <= this.previousEndIndex; i++) {
      let view = this.getView(i) as EmbeddedViewRef<any>;
      view.rootNodes[0].style.transform = `translate3d(0, ${i * this.rowHeight}px, 0)`;
      view.rootNodes[0].style.backgroundColor = `rgb(${12 * i}, ${12 * i}, ${12 * i})`;
      this.scrollContainer.insert(view);
      view.reattach();
    }
  }

  @HostListener('scroll') onScroll() {
    const scrollTop = this.viewport?.nativeElement.scrollTop;
    const scrollMax = this.viewport?.nativeElement.scrollMax;
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;

    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = 3 + startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);


    // console.log('scrolled');
    // console.log(startIndex, endIndex);
    // console.log('old positions', this.previousStartIndex, this.previousEndIndex);
    // console.log('scrollTop', scrollTop)
    if (endIndex >= this.items.length && !this.loading) {
      console.log('loading more items...');
      this.loading = true;
      return;
    }

    const fastScroll = this.previousEndIndex < startIndex || this.previousStartIndex > endIndex;
    if (fastScroll) {
      for (let i = 0; i < this.scrollContainer.length; i++)
        this.scrollContainer.detach(i);
      for (let i = startIndex; i <= endIndex; i++) {
        let view = this.getView(i) as EmbeddedViewRef<any>;
        view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        view.rootNodes[0].style.backgroundColor = `rgb(0, 0, ${12 * i})`;
        this.scrollContainer.insert(view);
        view.reattach();
      }
    } else {
      const scrollDown = this.previousStartIndex < startIndex;
      const scrollUp = this.previousStartIndex > startIndex;
      //TODO: store the previous scroll
      if (scrollDown) {
        //! what if user scrolles to end and trigger this
        //! then scroll top
        //! then scroll down
        //! booom!
        if (this.loading) return;
        for (let i = this.previousStartIndex; i < startIndex; i++)
          this.scrollContainer.detach(i - this.previousStartIndex);
        for (let i = startIndex; i < this.previousEndIndex; i++)
          (this.scrollContainer.get(i - startIndex) as EmbeddedViewRef<any>).rootNodes[0].style.transform =
            `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        for (let i = this.previousEndIndex; i <= endIndex; i++) {
          let view = this.getView(i) as EmbeddedViewRef<any>;
          view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
          view.rootNodes[0].style.backgroundColor = `rgb(${12 * i}, 0, 0)`;
          this.scrollContainer.insert(view);
          view.reattach();
        }
      } else if (scrollUp) {
        if (this.loading) this.loading = false;
        for (let i = this.previousStartIndex; i <= endIndex; i++)
          (this.scrollContainer.get(i - this.previousStartIndex) as EmbeddedViewRef<any>).rootNodes[0].style.transform =
            `translate3d(0, ${(i - this.previousStartIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        for (let i = endIndex + 1; i < this.previousEndIndex; i++)
          this.scrollContainer.detach(i - this.previousStartIndex);
        for (let i = this.previousStartIndex; i >= startIndex; i--) {
          let view = this.getView(i) as EmbeddedViewRef<any>;
          view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
          view.rootNodes[0].style.backgroundColor = `rgb( 0,  ${12 * i},  0)`;
          this.scrollContainer.insert(view, 0);
          view.reattach();
        }
      } else {
        for (let i = 0; i < this.scrollContainer.length; i++)
          (this.scrollContainer.get(i) as EmbeddedViewRef<any>).rootNodes[0].style.transform =
            `translate3d(0, ${(i) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
      }
    }


    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    this.previousStartIndex = startIndex;
    this.previousEndIndex = endIndex;
  }

  getView(index: number): ViewRef {
    let view = this.map.get(index);
    if (!view) {
      view = this.listItem.createEmbeddedView({ index });
      this.map.set(index, view);
    }
    return view;
  }
}
