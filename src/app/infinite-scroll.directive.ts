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
  //TODO: change the default values to the value of initial scroll
  previousStartIndex = 0;
  previousEndIndex = Math.ceil(500 / this.rowHeight);
  map: Map<number, ViewRef> = new Map();
  loading: boolean = false;
  initialized: boolean = false;

  constructor(private renderer: Renderer2) {
    this.paddingBottom = this.totalPadding = (this.items.length - 3) * this.rowHeight;

  }

  ngOnChanges(changes: SimpleChanges): void {
    //Called before any other lifecycle hook. Use it to inject dependencies, but avoid any serious work here.
    //Add '${implements OnChanges}' to the class.
    // const viewportChanges = changes['viewport'].currentValue;
    // if (viewportChanges != undefined) {
    //   console.log('Inner ==> ', viewportChanges);
    // const scrollTop = this.viewport.nativeElement.scrollTop;
    const scrollTop = 0;
    this.totalPadding = (this.items.length - 3) * this.rowHeight;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    // this.previousStartIndex = Math.floor(scrollTop / this.rowHeight);
    // this.previousEndIndex = this.previousStartIndex + Math.ceil((500 + this.paddingTop - this.previousStartIndex * this.rowHeight) / this.rowHeight);
    // this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    // this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    // this.initialized = true;
    // for (let i = this.previousStartIndex; i < this.previousEndIndex; i++) {
    //   let view = this.listItem.createEmbeddedView({ index: i });
    //   view.rootNodes[0].style.transform = `translate3d(0, ${(i - this.previousEndIndex) * this.rowHeight}px, 0)`;
    //   this.scrollContainer.insert(view);
    //   this.map.set(i, view);
    // }
    // }
  }

  ngAfterViewInit() {
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-top', `${this.paddingTop}px`);
    this.renderer.setStyle(this.listHolder?.nativeElement, 'padding-bottom', `${this.paddingBottom}px`);
    for (let i = this.previousStartIndex; i <= this.previousEndIndex; i++) {
      let view = this.listItem.createEmbeddedView({ index: i });
      view.rootNodes[0].style.transform = `translate3d(0, ${i * this.rowHeight}px, 0)`;
      view.rootNodes[0].style.backgroundColor = `rgb(${12 * i}, ${7 * i}, ${10 * i})`;
      this.scrollContainer.insert(view);
      this.map.set(i, view);
    }
  }

  @HostListener('scroll') onScroll() {
    const scrollTop = this.viewport?.nativeElement.scrollTop;
    if (!scrollTop) return;
    this.paddingTop = scrollTop;
    this.paddingBottom = this.totalPadding - this.paddingTop;
    let startIndex = Math.floor(scrollTop / this.rowHeight);
    let endIndex = startIndex + Math.ceil((500 + this.paddingTop - startIndex * this.rowHeight) / this.rowHeight);


    console.log('scrolled');
    console.log(startIndex, endIndex);
    console.log('old positions', this.previousStartIndex, this.previousEndIndex);
    console.log('scrollTop', scrollTop)

    if (endIndex >= this.items.length && !this.loading) {
      console.log('loading more items...');
      this.loading = true;
      return;
    }

    if (this.previousEndIndex < startIndex || this.previousStartIndex > endIndex) {
      for (let i = 0; i < this.scrollContainer.length; i++)
        this.scrollContainer.detach(i);
      for (let i = startIndex; i <= endIndex; i++)
        if (!this.map.has(i)) {
          let view = this.listItem.createEmbeddedView({ index: i });
          view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
          view.rootNodes[0].style.backgroundColor = `rgb(${12 * i}, ${7 * i}, ${10 * i})`;

          this.scrollContainer.insert(view);
          this.map.set(i, view);
          view.reattach();
        } else {
          let view = this.map.get(i);
          (view as EmbeddedViewRef<any>).rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
          if (view)
            this.scrollContainer.insert(view);
        }
    } else {
      //TODO: store the previous scroll
      if (this.previousStartIndex < startIndex) {
        console.log('=====CHECK1=====');
        for (let i = this.previousStartIndex; i < startIndex; i++)
          this.scrollContainer.detach(i - this.previousStartIndex);
        console.log('=====CHECK2=====');
        for (let i = startIndex; i < this.previousEndIndex; i++)
          (this.scrollContainer.get(i - startIndex) as EmbeddedViewRef<any>).rootNodes[0].style.transform =
            `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        for (let i = this.previousEndIndex; i <= endIndex; i++) {
          if (!this.map.has(i)) {
            let view = this.listItem.createEmbeddedView({ index: i });
            view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
            view.rootNodes[0].style.backgroundColor = `rgb(${12 * i}, ${7 * i}, ${10 * i})`;

            this.scrollContainer.insert(view);
            this.map.set(i, view);
            view.reattach();
          } else {
            let view = this.map.get(i);
            (view as EmbeddedViewRef<any>).rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
            if (view)
              this.scrollContainer.insert(view);
          }
        }
      } else if (this.previousStartIndex > startIndex) {
        for (let i = endIndex + 1; i < this.previousEndIndex; i++)
          this.scrollContainer.detach(i - this.previousStartIndex);
        for (let i = this.previousStartIndex; i <= endIndex; i++)
          (this.scrollContainer.get(i - this.previousStartIndex) as EmbeddedViewRef<any>).rootNodes[0].style.transform =
            `translate3d(0, ${(i + startIndex - this.previousStartIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
        for (let i = this.previousStartIndex; i >= startIndex; i--) {
          if (!this.map.has(i)) {
            let view = this.listItem.createEmbeddedView({ index: i });
            view.rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
            view.rootNodes[0].style['background-color'] = `rgb(10 * i, 15 *i, 15 *i)`;
            this.scrollContainer.insert(view, 0);
            this.map.set(i, view);
            view.reattach();
          } else {
            let view = this.map.get(i);
            (view as EmbeddedViewRef<any>).rootNodes[0].style.transform = `translate3d(0, ${(i - startIndex) * this.rowHeight - (scrollTop % this.rowHeight)}px, 0)`;
            if (view)
              this.scrollContainer.insert(view, 0);
          }
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
}
