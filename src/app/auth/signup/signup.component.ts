import { Component, ElementRef, Input, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, PhoneService, UtilService } from '../../shared/services';
import { ToastyService } from 'ng2-toasty';
import { TranslateService } from '@ngx-translate/core';
import * as $ from 'jquery';
import { NgbDateParserFormatter } from '@ng-bootstrap/ng-bootstrap';
import { CategoryService, ProductService } from '../../product/services';
import { ProducttransactiontypeService } from '../../product/services/producttransactiontype.service';
import { NgForm } from '@angular/forms';
import { resolve } from 'url';

const reEmail = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+/;
const reOtherPhone = /(\d{1,2}[.-\s]?)(\d{3}[.-]?){2}\d{4}/g;
const reAmericaPhone = /^[0-9]{3}[-\s\.]?[0-9]{7,7}$/im;

@Component({
  selector: 'auth-signup',
  templateUrl: 'signup.component.html'
})
export class SignupComponent {
  Auth: AuthService;
  @ViewChild('signupModal') signupModal: ElementRef;
  @ViewChild('ngxIntlTelInput') ngxIntlTelInput: ElementRef;

  @Input() show;
  public backdrop: boolean = false;
  public isVerified: boolean = false;

  public dialCode: any = '';

  public account: any = {
    value: '',
    password: '',
    isShop: false,
  };
  
  public input: any = {
    rePassword: ''
  };
  isSubmitted = false;

  public submitted: boolean = false;
  public otp: boolean = false; 
  public timezone: string = 'America';
  public usePassword: boolean = true;

  constructor(
    auth: AuthService,
    public router: Router,
    private toasty: ToastyService,
    private translate: TranslateService,
    private utilService: UtilService,
    private formatter: NgbDateParserFormatter,
    private producttransactiontypeService: ProducttransactiontypeService,
    private categoryService: CategoryService,
    private productService: ProductService,
    private phoneService: PhoneService
  ) {
    this.Auth = auth;
  }


  ngOnInit() {
    this.utilService.showRegister.subscribe(res => {
      if (res) {
        this.showModal();
      }
    })
    this.phoneService.getTimezone().then((res: any) => { this.timezone = res.timezone}).catch(err=> { console.log(err)})

  }


  login() {
    this.hideModal();
    this.utilService.showLogin.next(true);
  }

  public onlyNumberKey(event) {
    return (event.charCode == 8 || event.charCode == 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  selectDial(event) {
    this.dialCode = event;
  }

  // Step 1
  public submit(frm: any) {
    this.submitted = true;

    if (frm.invalid) {
      return;
    }

    if(!this.isSubmitted) {
      return; 
    }

    if(this.usePassword && this.otp) {
      if (this.account.password !== this.input.rePassword) {
        return this.toasty.error(this.translate.instant('Confirm password doest not match'));
      }


      this.account.via = 'email';
      this.account.email = this.account.value;
      delete this.account['value'];

      this.Auth.register(this.account)
      .then(resp => {
        this.hideModal();
        if(this.usePassword){
          this.toasty.success(this.translate.instant('Your account has been created, please verify your email then login.'));
        }
        
        this.signupModal.nativeElement.style.display = 'none';
        frm.reset();

      })
      .catch(err => {
        this.toasty.error(this.translate.instant(err.data.data.message));
      });

    } else if(!this.usePassword && this.otp){

      const param = {
        phoneNumber: this.account.value,
        code: this.account.password
      }
      this.Auth.verificationChecks(param).then(res => {
        if(res.data.success) {
          if(res.data.status == "approved") {

            this.account.phoneNumber = this.account.value;
            this.account.via = 'phone';
            delete this.account['value'];

            this.Auth.register(this.account)
            .then((resp: any) => {
              this.hideModal();
              this.toasty.success(this.translate.instant('Your account has been created'));
              this.signupModal.nativeElement.style.display = 'none';
              frm.reset();

              this.loginAfterSignup(resp.data)
            })
            .catch(err => {
              this.toasty.error(this.translate.instant(err.data.data.message));
            });
          } else if(res.data.status == "pending") {
            this.toasty.error('Something went wrong')
          }
        }
      }).catch((err) => {
        this.toasty.error(this.translate.instant(err.message))
      })
    } else {
      return this.toasty.error(this.translate.instant('Something went wrong'))
    }
  }

  loginAfterSignup(data) {
    this.Auth.loginafterSignup(data).then(res=> {
      this.router.navigate(['/']);
    }).catch(err => {
      console.log(err)
    })
  }
  

  onNext() {
    if((this.account.value).match(reEmail)){
        this.checkUserExists(this.account.value).then(res => {
          this.otp = true;
          this.usePassword = true;
          this.isSubmitted = true  

          setTimeout(() => {
            document.getElementById('signup-password').focus();
          }, 1000)

        })
    } else if ((this.account.value).match(reOtherPhone) && this.timezone === 'Other') {
        this.account.value = this.account.value[0] === '+'  ? this.account.value : '+' + this.account.value

        this.checkUserExists(this.account.value).then(res => {
          this.sendOtp(this.account.value);
        })
    
    } else if ((this.account.value).match(reAmericaPhone) && this.timezone === 'America') {
      let phone =  this.account.value;

      this.checkUserExists(phone).then(res => {
        this.sendOtp(phone);
      })
    } else {
      if(this.timezone === 'America') {
        return this.toasty.error('Please enter a valid email or 10 digit phone number');
      } else {
        return this.toasty.error('Please enter a valid email or phone number with + country code');
      }
    }
  }

  checkUserExists(value): Promise<any> {
    return new Promise((resolve, reject)=> {
    this.Auth
        .checkUserExists({value: value})
        .then((res) => {
          if(res.data.data.code === 200) {
            resolve(res.data.data)
              
          } else {
            this.resetCredentials()
            this.toasty.error('This user already has an account');
          }
        })
        .catch(err => {
          this.toasty.error('Something Went Wrong!');
          this.resetCredentials()
        })
    })
  }

  sendOtp(phoneNumber) {
    const param = {
      phoneNumber: phoneNumber
    }
    this.Auth.verifyPhone(param).then(res => {
      this.otp = true;
      this.usePassword = false;
      this.isSubmitted = true  

      setTimeout(() => {
        document.getElementById('signup-otp').focus();
      }, 1000)

    }).catch((err) => {
      this.toasty.error(this.translate.instant('Please enter a valid Phone Number'))
    })
  }

  resendOTP() {
    this.sendOtp(this.account.value)
  }


  resetCredentials() {
    this.otp = false;
    this.usePassword = true;
    this.account = {value: '', password: '', isShop: false,}
  }

  showModal() {
    setTimeout(() => {
      document.getElementById('signup-inp').focus()
    }, 500)
    this.signupModal.nativeElement.classList.add('show');
    this.signupModal.nativeElement.style.display = 'block';
    this.backdrop = true;
  }

  hideModal() {
    this.signupModal.nativeElement.classList.remove('show');
    this.signupModal.nativeElement.style.display = 'none';
    this.backdrop = false;
    this.isSubmitted = false;

    this.resetCredentials()
  }

  changePhoneNumber(ev) {
    this.isVerified = false
  }

}
