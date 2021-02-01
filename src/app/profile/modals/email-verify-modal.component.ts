import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, Renderer2, OnChanges } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastyService } from 'ng2-toasty';
import { TranslateService } from '@ngx-translate/core';
import { AuthService } from '../../shared/services';


@Component({
  templateUrl: './email-verify-modal.html'
})
export class EmailVerifyModalComponent  {

  
  value: '';
  @Input() id: '';

  constructor(
    public activeModal: NgbActiveModal,
    public toasty: ToastyService,
    private authService: AuthService
  ) {}


  submit(frm: any) {

    if(!frm.valid) {
      return this.toasty.error('please enter a valid form')
    }

    this.authService.verifyEmailToken({token: this.value, id: this.id }).then((res => {
      this.activeModal.close(true);

    })).catch(err => {
      console.log(err)
      this.toasty.error('Please enter a valid token')
    })
  }
}