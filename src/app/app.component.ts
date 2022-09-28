import { AfterViewInit, Component, ElementRef, EmbeddedViewRef, HostListener, OnInit, Renderer2, TemplateRef, ViewChild, ViewContainerRef, ViewRef } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'scroll';
}
