import { Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastyService } from 'ng2-toasty';
import { CategoryService, ProductService, ProducttypeService } from '../../../../product/services';


@Component({
  selector: 'password-modal',
  templateUrl: 'password-modal.component.html'
})
export class PasswordModalComponent {
  
  credentials = {
    password: ''
  }

  constructor() {}

  
   
}

