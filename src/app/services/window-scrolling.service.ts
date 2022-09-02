import { Injectable } from '@angular/core';
import { BehaviorSubject } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class WindowScrollingService {
  scrollY = new BehaviorSubject(0);
  scrollY$ = this.scrollY.asObservable();

  constructor() { }

  updateScrollY(newScroll: number) {
    this.scrollY.next(newScroll);
  }
}
