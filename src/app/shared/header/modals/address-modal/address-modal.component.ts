import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastyService } from 'ng2-toasty';


@Component({
  selector: 'address-modal',
  templateUrl: 'address-modal.component.html'
})
export class AddressModalComponent {
 
    public address = {
      address: '',
      zipcode: '',
      city: '',
      state: '',
      country: ''
    }

    isSubmitted:boolean = false;

    constructor(activeModal: NgbActiveModal) {}

    submit(frm: NgForm) {
    } 
}
