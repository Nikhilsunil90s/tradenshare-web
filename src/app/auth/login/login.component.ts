import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService, PhoneService, UtilService } from '../../shared/services';
import { TranslateService } from '@ngx-translate/core';
import { ToastyService } from 'ng2-toasty';

import * as $ from 'jquery';

const reEmail = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+/;
const reOtherPhone = /(\d{1,2}[.-\s]?)(\d{3}[.-]?){2}\d{4}/g;
const reAmericaPhone = /^[0-9]{3}[-\s\.]?[0-9]{7,7}$/im;

@Component({
  selector: 'auth-login',
  templateUrl: 'login.component.html'
})
export class LoginComponent {
  private Auth: AuthService;

  @ViewChild('loginModal') loginModal: ElementRef;
  @ViewChild('ngxIntlTelInput') ngxIntlTelInput: ElementRef;

  public backdrop: boolean = false;
  public showLogin: boolean = true;
  public timezone = 'America'


  @Output() showRegisterModal: EventEmitter<any> = new EventEmitter<any>();

  public credentials = {
    value: '',
    password: ''
  };

  public otp: boolean = false;
  public submitted: boolean = true;
  public isSubmitted: boolean = false;
  public loginType: boolean = true;
  public usePassword: boolean = true;
  public showUseOtp: boolean = true;
  private time: any = '';

  constructor(
    private auth: AuthService,
    private router: Router,
    private translate: TranslateService,
    private toasty: ToastyService,
    private utilService: UtilService,
    private phoneService: PhoneService
  ) {
    this.Auth = auth;
  }

  ngOnInit() {
    this.utilService.showLogin.subscribe(res => {
      if (res) {
        this.showModal();
      }
    })

    this.phoneService.getTimezone().then((res: any) => { this.timezone = res.timezone }).catch(err => { console.log(err) })
  }

  setBrowserLocation() {
    window.navigator.geolocation.getCurrentPosition((resp) => {
      let location = {
        'latitude': resp.coords.latitude,
        'longitude': resp.coords.longitude
      }
      localStorage.setItem('userLocation', JSON.stringify(location));
    })
  }

  login(frm: any) {
    this.submitted = true;
    if (frm.invalid) {
      return;
    }

    if (!this.isSubmitted) {
      return
    }


    if (this.usePassword) {
      this.Auth.login({ email: this.credentials.value, password: this.credentials.password }).then((data) => {
        this.hideModal();

        if (data.isShop && data.shopId) {
          this.Auth.generateTokenForSellerLogin({ email: data.email, via: 'email' }).then((res) => {
            window.location.href = window.appConfig.sellerUrl + '/auth/autologin/' + res.data.data.autoLoginToken;
          })
        } else {
          const redirectUrl = sessionStorage.getItem('redirectUrl');
          if (redirectUrl) {
            sessionStorage.removeItem('redirectUrl');
            this.router.navigate([redirectUrl]);
          } else {
            this.redirect(data)
          }
        }
         
      })
        .catch((error) => {
          let message = error.data.message;
          this.showError(message);
        });
    } else {
      let data = {
        via: 'phone',
        phoneNumber: this.credentials.value,
        password: this.credentials.password
      }

      this.auth.loginWithOtp(data).then((res: any) => {
        this.hideModal();
        if(res.isShop && res.shopId) {
          this.Auth.generateTokenForSellerLogin({ phone: res.phoneNumber, via: 'phone' }).then((res) => {
            window.location.href = window.appConfig.sellerUrl + '/auth/autologin/' + res.data.data.autoLoginToken;
          })
        } else {
          const redirectUrl = sessionStorage.getItem('redirectUrl');
          if (redirectUrl) {
            sessionStorage.removeItem('redirectUrl');
            this.router.navigate([redirectUrl]);
          } else {
            this.redirect(res)
          }
        }
         
      }).catch(error => {
        console.log(error)
        this.showError(error.data.message);
      })
    }
  }

  showError(message) {
    if (message === "ERR_USER_NOT_FOUND") {
      return this.toasty.error('This user was not found please register and then login');
    } else if (message === 'ERR_PASSWORD_IS_INCORRECT') {
      return this.toasty.error('Please enter correct Password');
    } else if (message === 'ERR_TOKEN_INVALID') {
      return this.toasty.error('Please enter correct OTP')
    } else if (message === 'ERR_EMAIL_NOT_VERIFIED') {
      return this.toasty.error('Please verify your Email')

    } else {
      return this.toasty.error('Something went Wrong');
    }
  }

  redirect(user) {
    this.router.navigate(['/']);
    // if(!user.email || !user.phoneNumber || !user.name || !user.gender || !user.address  ||  !user.state || !user.country || !user.zipCode ||  !user.phoneVerified || !user.emailVerified) {
    //   return this.router.navigate(['/profile/update'])
    // } else {
    //   this.router.navigate(['/'])
    // }
  }



  onNext() {

    if ((this.credentials.value).match(reEmail)) {
      this.otp = true;
      this.usePassword = true;
      this.isSubmitted = true

      setTimeout(() => {
        document.getElementById('login-password').focus();
      })

    } else if ((this.credentials.value).match(reOtherPhone) && this.timezone === 'Other') {

      this.credentials.value = this.credentials.value[0] === '+' ? this.credentials.value : '+' + this.credentials.value
      this.sendOtp('phone', this.credentials.value);

    } else if ((this.credentials.value).match(reAmericaPhone) && this.timezone === 'America') {

      let phone =  this.credentials.value
      this.sendOtp('phone', phone);

    } else {
      if (this.timezone === 'America') {
        return this.toasty.error('Please enter a valid email or 10 digit phone number');
      } else {
        return this.toasty.error('Please enter a valid email or phone number with + country code');
      }
    }

  }

  resetOptions() {
    this.otp = false;
    this.loginType = true;
    this.usePassword = true;
  }

  sendOtp(via: string, value: string) {
    this.auth.getOtp({ via, value })
      .then((res: any) => {
        this.toasty.success('OTP is Send to Your Mobile');
        this.otp = true;
        this.usePassword = false;
        this.isSubmitted = true;

        setTimeout(() => {
          document.getElementById('login-otp').focus();
        })

      }).catch(error => {
        console.log(error)
        this.resetCredentials();
        this.toasty.error(this.translate.instant('We did not find a user with this email or phone number'))
      })
  }


  changeLoginType(type: string) {
    this.resetCredentials();
    if (type === 'email') {
      this.loginType = true;
      this.otp = false;
    } else {
      this.loginType = false;
      this.otp = true;
    }
  }

  useLoginPassword(value) {
    if (value) {
      this.usePassword = true;
      this.otp = false;
    } else {
      this.usePassword = false;
      this.otp = true;
    }
  }

  resetCredentials() {
    this.credentials = {
      value: '',
      password: ''
    }
  }

  resendOTP() {
    this.sendOtp('phone', this.credentials.value);
  }

  resetPasswordCredentials() {
    this.credentials['password'] = ''
  }

  showModal() {
    this.resetCredentials()
    this.resetOptions()
    setTimeout(() => {
      document.getElementById('login-inp').focus()
    }, 500);

    this.loginModal.nativeElement.classList.add('show');
    this.loginModal.nativeElement.style.display = 'block';
    this.backdrop = true;

  }

  public onlyNumberKey(event) {
    return (event.charCode == 8 || event.charCode == 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  hideModal() {
    this.loginModal.nativeElement.classList.remove('show');
    this.loginModal.nativeElement.style.display = 'none';
    this.backdrop = false;
    this.showLogin = true;
    this.isSubmitted = false;
  }

  forgetPassword() {
    this.showLogin = false;
  }

  onShowLogin() {
    this.showLogin = true;
  }

  showRegister() {
    this.hideModal();
    this.utilService.showRegister.next(true);
  }


}
