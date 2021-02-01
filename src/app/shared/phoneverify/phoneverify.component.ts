import { Component, ElementRef, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges, ViewChild } from '@angular/core';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { reject } from 'lodash';
import { ToastyService } from 'ng2-toasty';
import { AuthService, PhoneService } from '../services';

@Component({
  selector: 'app-phoneverify',
  templateUrl: './phoneverify.component.html',
})
export class PhoneverifyComponent implements OnInit, OnChanges {

  public isSubmitted: boolean = false;
  private modalRef: NgbModalRef;
  public verificationCode: string;
  timezone = 'America'; 
  @Input() phoneNumber: any;
  @Input() isVerified: any;
  @Input() dialCode: any;
  @Input() isInValid: any;
  @Output() approve : EventEmitter<any> = new EventEmitter<any>();
  @ViewChild('phoneverificationmodal') verificationmodal: ElementRef;

  constructor(
    private translate: TranslateService,
    private modalService: NgbModal,
    private authService: AuthService,
    private toasty: ToastyService,
    private phoneService: PhoneService) {
    }

  ngOnChanges(changes: SimpleChanges): void {

  }

  ngOnInit(): void {
    this.phoneService.getTimezone().then((res: any) => { this.timezone = res.timezone}).catch(err=> { console.log(err)})

  }

  verifyPhone() {
    if(this.isInValid == true) {
      if(this.timezone === 'America') {
        this.toasty.error('Please enter a valid 10 digit phone number ')
        return false;
      } else {
        this.toasty.error('Please enter a valid phone number with + country code');
        return false;
      }
    }

    if(!this.phoneNumber ) {
      if(this.timezone === 'America') {
        this.toasty.error('Please enter a valid 10 digit phone number ')
        return false;
      } else {
        this.toasty.error('Please enter a valid phone number with + country code');
        return false;
      }
    }

    
    const reOtherPhone = /(\d{1,2}[.-\s]?)(\d{3}[.-]?){2}\d{4}/g;
    const reAmericaPhone = /^[0-9]{3}[-\s\.]?[0-9]{7,7}$/im;
    
    if((this.phoneNumber).match(reOtherPhone) && this.timezone === 'Other' ){
      this.phoneNumber = this.phoneNumber[0] === '+' ? this.phoneNumber : '+' + this.phoneNumber; 
    } else if ((this.phoneNumber).match(reAmericaPhone) && this.timezone === 'America' ) {
      this.phoneNumber = '+1' + this.phoneNumber; 

    } else {
      if(this.timezone === 'America') {
        this.toasty.error('Please enter a valid 10 digit phone number ')
        return false;
      } else {
        this.toasty.error('Please enter a valid phone number with + country code');
        return false;
      }
    }


      this.sendCode().then((res) => {
        if(res.data.success && res.data.status == "pending") {
          this.toasty.success("Verification code sent to your phone")
          this.openVerifymodal()
    }
      }).catch((err) => {
        this.toastError()
      })
    

  }

  sendCode(): Promise<any> {
    return new Promise((resolve, reject)=> {
      const param = {
        phoneNumber: this.phoneNumber
      }
      this.authService.verifyPhone(param).then(res => {
        resolve(res)

      }).catch((err) => {
        if(this.timezone === 'America') {
          this.phoneNumber = this.phoneNumber.replace('+1', '')
          this.toasty.error('Please check your phone number it should be 10 digit number')
        } else {
          this.toasty.error('Please check your phone number it should be + country code with number')
        }
      })
    });

  }

  verifyCode(frm: any) {
    this.isSubmitted = true;
    if (!frm.valid) {
      return this.toastError()
    }
    const param = {
      phoneNumber: this.phoneNumber,
      code: this.verificationCode
    }
    this.authService.verificationChecks(param).then(res => {
      if(res.data.success) {
        if(res.data.status == "approved") {
          this.isVerified = true;
          this.approve.emit(true)
        } else if(res.data.status == "pending") {
          this.toastError()
          this.approve.emit(false)
        }
        this.closemodal()
      }
    }).catch((err) => {
      this.toasty.error(this.translate.instant(err.message))
    })
  }

  reSendVerifyNumber() {
    this.clearForm()
    this.sendCode().then((res) => {
      this.toasty.success("Verification code sent to your phone")
    }).catch((err) => {
      this.toastError()
    })
  }

  openVerifymodal() {
    this.clearForm()
    const ngbModalOptions: NgbModalOptions = {
      backdrop: 'static',
      keyboard: false,
      centered: true,
    };
    this.modalRef = this.modalService.open(this.verificationmodal, ngbModalOptions);
  }

  closemodal() {
    if (this.modalRef != undefined) {
      this.modalRef.close()
    }
  }

  toastError() {
    this.toasty.error(this.translate.instant('Something went wrong, please check and try again!'))
  }

  clearForm() {
    this.verificationCode = ""
  }
}
