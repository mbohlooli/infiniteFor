import {
  Directive,
  TemplateRef,
  HostListener,
  Input,
  ViewContainerRef,
  AfterViewInit,
  DoCheck,
  IterableDiffer,
  IterableDiffers,
  OnChanges,
  SimpleChanges,
  IterableChanges
} from '@angular/core';

@Directive({
  selector: '[infiniteFor][infiniteForOf]'
})
export class InfiniteForDirective<T> implements DoCheck, OnChanges {
  @Input('infiniteForOf') data: T[] = [];

  private _differ: IterableDiffer<T> | undefined;
  private _collection: T[] = [];

  constructor(
    private _viewContainer: ViewContainerRef,
    private _template: TemplateRef<any>,
    private _differs: IterableDiffers
  ) { }

  ngOnChanges(changes: SimpleChanges) {
    if (!('data' in changes)) return;

    const value = changes['data'].currentValue;
    if (this._differ || !value) return;

    this._differ = this._differs.find(value).create();
  }

  ngDoCheck() {
    if (!this._differ) return;
    const changes = this._differ.diff(this.data);
    if (changes) this.applyChanges(changes);
  }

  applyChanges(changes: IterableChanges<T>) {
    changes.forEachOperation((item, previousIndex, currentIndex) => {
      if (item.previousIndex == null) {
        if (currentIndex == null) return;
        this._collection.splice(currentIndex, 0, item.item);
      } else if (currentIndex == null) {
        if (previousIndex == null) return;
        this._collection.splice(previousIndex, 1);
      } else {
        if (currentIndex == null || previousIndex == null) return;
        this._collection.splice(currentIndex, 0, this._collection.splice(previousIndex, 1)[0]);
      }
    });

    this.requestLayout();
  }

  requestLayout() {
    for (let i = 0; i < this._viewContainer.length; i++)
      this._viewContainer.detach(i);
    this.insertViews();
  }

  insertViews() {
    for (let i = 0; i < this.data.length; i++) {
      let view = this._template.createEmbeddedView({ $implicit: this._collection[i] });
      this._viewContainer.insert(view);
    }
  }

  @HostListener('scroll')
  onScroll() {
  }
}
