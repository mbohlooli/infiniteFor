import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppComponent } from './app.component';
import { InfiniteForDirective } from './infinite-for.directive';
import { InfiniteListComponent } from './infinite-list/infinite-list.component';

@NgModule({
  declarations: [
    InfiniteForDirective,
    AppComponent,
    InfiniteListComponent,
  ],
  imports: [
    CommonModule,
    BrowserModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
