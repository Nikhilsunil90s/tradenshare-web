import { Component, OnInit, OnDestroy, Output, EventEmitter, ElementRef, Input } from '@angular/core';
import { Subscription } from 'rxjs/Subscription';
import { Router } from '@angular/router';
import { AuthService, SystemService, CartService, PhoneService } from '../services';
import { NgbModal, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { ComplainComponent } from '../complain/complain.component';
import { TranslateService } from '@ngx-translate/core';
import { AutocompleteLibModule } from 'angular-ng-autocomplete';
import { CategoryService, ProductService, ProducttypeService } from '../../product/services';
import { UtilService } from './../../shared/services/utils.service';
import { ViewChild } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ToastrService } from 'ngx-toastr';
import { SearchCountryField, TooltipLabel, CountryISO } from 'ngx-intl-tel-input';
import { ProductModalComponent } from './modals/product-modal/product-modal.component';



const reEmail = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+/;
const reOtherPhone = /(\d{1,2}[.-\s]?)(\d{3}[.-]?){2}\d{4}/g;
const reAmericaPhone = /^[0-9]{3}[-\s\.]?[0-9]{7,7}$/im;

@Component({
  selector: 'app-header',
  templateUrl: './header.html'
})
export class HeaderComponent implements OnInit, OnDestroy {
  @Output() updateFields = new EventEmitter();
  @ViewChild('searchautocomplete') searchautocomplete;
  @ViewChild('dropdownMenu') dropdownMenu: ElementRef;

  public currentUser: any;
  public isShowed: any = false;
  private userLoadedSubscription: Subscription;
  public appConfig: any = {};
  public userLang: any = 'ca';
  public languages: any = [];
  public flag: any = `/assets/images/flags/ca.svg`;
  public isLoaded: any = false;
  private cartLoadedSubscription: Subscription;
  public cart: any = [];
  public q: string = '';
  public items: any = [];
  public searchData: any = [];
  public isLoading = false;
  public keyword = 'name';
  public search_ = '';
  public backdrop: boolean = false;
  public showEmail: boolean = false;
  public CountryISO = CountryISO;
  private profileCompleted: boolean = false;
  public otp: boolean = false;
  private tempUser: any = {};
  public termsAndConditions: false;
  private shopId = '';
  public openZipcode = false;
  public zipcode = ''
  public isVerified = false;
  public timezone = 'America';

  @ViewChild('Modal') Modal: ElementRef;
  credentials = {
    shopType: '',
    value: '',
    password: ''
  }

  otpDetaiils: any = {
    via: '',
    value: ''
  };

  user: boolean = false;

  constructor(private router: Router, private authService: AuthService, private systemService: SystemService,
    private modalService: NgbModal,
    private translate: TranslateService,
    private cartService: CartService,
    private productService: ProductService,
    private phoneService: PhoneService,
    private util: UtilService,
    private toasty: ToastrService,
    private categoryService: CategoryService,
    private producttypeService: ProducttypeService) {
    this.userLoadedSubscription = authService.userLoaded$.subscribe(data => this.currentUser = data);
    this.cartLoadedSubscription = cartService.cartChanged$.subscribe(data => this.cart = data);


    this.systemService.configs().then(resp => {
      this.isLoaded = true;
      this.languages = resp.i18n.languages;
      this.flag = `/assets/images/flags/ca.svg`;
      this.appConfig = resp;
    });

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

    return true
  }


  ngOnInit() {
    this.cart = this.cartService.get();
    if (this.authService.isLoggedin()) {
      this.authService.getCurrentUser().then(resp => {
        this.currentUser = resp;
        this.otp = true;
        if (this.currentUser.email && this.currentUser.phoneNumber) {
          this.profileCompleted = true;
        }
      });
    }

    this.authService.profileCompleted.subscribe(res => {
      this.profileCompleted = res;
    })

    this.util.emptySearchbar.subscribe((res) => {
      this.searchautocomplete.query = ''
      this.searchautocomplete.data = []
      this.searchautocomplete.clear();
    })

    this.util.changesDetect.subscribe(res => {
      this.authService.getUser().then(resp => {
        this.currentUser = resp;
      })
    })
  }



  ngOnDestroy() {
    // prevent memory leak when component destroyed
    this.userLoadedSubscription.unsubscribe();
  }

  logout() {
    this.authService.removeToken();
    window.location.href = '/';
  }

  dropdown() { }

  complain() {
    const ngbModalOptions: NgbModalOptions = {
      backdrop: 'static',
      keyboard: false
    };
    this.modalService.open(ComplainComponent, ngbModalOptions);
  }

  changeLang(lang: any) {
    this.translate.use(lang);
    this.userLang = lang;
    this.flag = `/assets/images/flags/${this.userLang}.svg`;
  }

  keyPress(event: any) {
    if (event.charCode === 13) {
      this.search();
    }
  }

  search() {
    if (!this.productService.searchFields['q'].trim()) {
      return;
    }
  }

  onClearSearch(e) {
    if (this.searchautocomplete.query === '') {
      this.productService.searchFields['q'] = '';
    }

    if (this.router.url.match(/\/products\/search\?q=*/gm) || this.router.url === '/') {
      if (this.router.url.match(/\/products\/search\?q=*/gm)) {
        return this.router.navigate(['/'])
      }

      this.submitSearch();
      this.searchautocomplete.close();
    }
  }

  selectEvent(item) {

    this.productService.searchFields['q'] = encodeURIComponent(item.name);
    this.router.navigate(['/products/search'], {
      queryParams: { q: this.productService.searchFields['q'] }
    });
  }

  onChangeSearch(val: string) {
    this.productService.searchFields['q'] = encodeURIComponent(val);
    this.query();
  }

  keypressEvent(event) {
    console.log(event);
    if (event.keyCode == 13) {
      this.submitSearch();
    }
  }

  submitSearch() {
    this.router.navigate(['/products/search'], {
      queryParams: { q: this.productService.searchFields['q'] }
    });
  }

  onFocused(e) { }



  query() {

    const params = Object.assign({
      //q: this.q
    }, this.productService.searchFields);

    this.productService.search(params).then((res) => {
      this.items = res.data.items;
      this.util.setLoading(false);
      this.isLoading = false;
      this.searchData = { 'id': '', 'name': this.productService.searchFields.q, "alias": '' }
      this.searchData = Object.keys(this.items).map(key => {
        let data = {};
        data = { 'id': this.items[key].id, "name": this.items[key].name, "alias": this.items[key].alias };
        return data;
      });
    }).catch(() => {
      this.util.setLoading(false);
      this.isLoading = false;
    });

  }

  openSeller(type: any) {
    if (this.currentUser) {
      this.redirect(this.currentUser, type);
    } else {
      this.credentials.shopType = type;
      this.showModal();
    }
  }

  redirect(user, type) {
   
      this.credentials.shopType = type;
      this.authService.getCurrentUser().then(user => {
        if (user.isShop && user.email) {

          this.authService.generateTokenForSellerLogin({ email: user.email, via: 'email' }).then((res) => {
            window.location.href = window.appConfig.sellerUrl + '/auth/autologin/' + res.data.data.autoLoginToken;
          })
        } else if(user.isShop && user.phoneNumber) {
          this.authService.generateTokenForSellerLogin({ phone: user.phoneNumber, via: 'phone' }).then((res) => {
            window.location.href = window.appConfig.sellerUrl + '/auth/autologin/' + res.data.data.autoLoginToken;
          })
        }else {
          this.showModal();
        }
      })
  }


  showModal() {
    this.backdrop = true;
    setTimeout(() => {
      document.getElementById('shop-inp').focus();
    }, 1000)
    this.Modal.nativeElement.style.display = "block";
    this.Modal.nativeElement.classList.add('show');
  }

  hideModal() {
    this.Modal.nativeElement.classList.remove('show');
    this.Modal.nativeElement.style.display = 'none';
    this.backdrop = false;
    this.resetModal();

  }

  onChecked(event) {
    let value = event.target.value;
    if (value === 'email') {
      this.showEmail = true;
    } else {
      this.showEmail = false;
    }
  }

  onSubmitModal(frm: NgForm) {
    if (!frm.valid) {
      return this.toasty.error('Please enter a valid Form');
    }

    if (!this.currentUser && !this.otp) {


      if ((this.credentials.value).match(reEmail)) {
        this.otpDetaiils = { via: 'email', value: this.credentials.value }
        this.sendOtp('email', this.credentials.value);
      } else if ((this.credentials.value).match(reOtherPhone) && this.timezone === 'Other') {
        this.credentials.value = this.credentials.value[0] === '+' ? this.credentials.value : '+' + this.credentials.value;
        this.otpDetaiils = { via: 'phone', value: this.credentials.value }
        this.sendOtp('phone', this.credentials.value);
      } else if ((this.credentials.value).match(reAmericaPhone) && this.timezone === 'America') {

        this.otpDetaiils = { via: 'phone', value: '+1' + this.credentials.value }
        this.sendOtp('phone', '+1' + this.credentials.value);
      } else {
        if (this.timezone === 'America') {
          return this.toasty.error('Please enter a valid email or 10 digit phone number');
        } else {
          return this.toasty.error('Please enter a valid email or phone number with + country code');
        }
      }

    } else if (!this.currentUser && this.otp) {

      if (!this.termsAndConditions) {
        return this.toasty.error('Please Select Terms and Conditions');
      }

      let subscription;
      if (this.user) {
        subscription = this.authService.checkOtp({ id: this.tempUser._id, otp: this.credentials.password })
      } else {
        subscription = this.authService.checkOtpForShop({ id: this.tempUser._id, otp: this.credentials.password })
      }

      subscription.then(res => {

        this.isVerified = true;
        this.tempUser = res.data.data.user ? res.data.data.user : this.tempUser
        this.createShop(this.tempUser._id)

      })
        .catch(err => {
          return this.toasty.error(err.data.data.message);
        })
    } else {
      if (!this.termsAndConditions) {
        return this.toasty.error('Please Select Terms and Conditions');
      }
      this.createShop(this.currentUser._id);
    }
  }

  createShop(id: any) {
    this.authService.createShop(id, this.credentials.shopType).then((res) => {
      console.log(res)
      window.location.href = window.appConfig.sellerUrl + '/auth/autologin/' + res.data.data.token
    }).catch(error => {
      this.toasty.error(error.data.data.message)
    })

  }

  openZip() {
    this.openZipcode = true;
  }

  openProductModal() {
    const modalRef = this.modalService.open(ProductModalComponent, {
      size: 'md'
    });

    modalRef.componentInstance.zipcode = this.currentUser.zipCode;
    modalRef.result.then(result => {
      console.log(result)
    }).catch(error => {
      console.log(error)
    })
  }

  sendOtp(via, value) {
    let subscription = this.authService.getOtpIfUserExists({ via, value });

    subscription.then(resp => {
      this.tempUser = resp.data.data.user;

      if (this.tempUser.isShop || this.tempUser.shopId) {
        return this.toasty.error('User Already has an E-store')
      }


      this.toasty.success('we have sent an OTP on your ' + via);
      this.otp = true;
      this.user = true;


      setTimeout(() => {
        document.getElementById('shop-password').focus();
      }, 1000)
    })
      .catch(err => {

        if (err.data.message === "ERR_USER_SHOP_EXISTS") {
          return this.toasty.error('User Already has an E-store')
        }


        this.authService.getOtpIfUserNotExists({ via, value }).then((resp) => {
          console.log(resp)
          this.otp = true;
          this.tempUser = resp.data.data.user
          this.user = false;
        }).catch(err => {
          console.log(err)
        })

      })
  }

  resendOTP() {

    this.sendOtp(this.otpDetaiils.via, this.otpDetaiils.value)

  }


  public onlyNumberKey(event) {
    return (event.charCode == 8 || event.charCode == 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  resetModal() {
    this.credentials = {
      shopType: '',
      value: '',
      password: ''
    }
    this.otp = false;
    this.tempUser = {};
    this.isVerified = false;
    this.termsAndConditions = false;
  }

}
