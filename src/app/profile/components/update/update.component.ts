import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterContentInit, AfterViewInit } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';
import { AuthService, LocationService, PhoneService, UtilService } from '../../../shared/services';
import { ToastyService } from 'ng2-toasty';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { NgbModal, NgbModalOptions, NgbModalRef } from '@ng-bootstrap/ng-bootstrap';
import { NgForm } from '@angular/forms';
import { EmailVerifyModalComponent } from '../../modals/email-verify-modal.component';

const reEmail = /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])+/;
const reOtherPhone = /(\d{1,2}[.-\s]?)(\d{3}[.-]?){2}\d{4}/g;
const reAmericaPhone = /^[0-9]{3}[-\s\.]?[0-9]{7,7}$/im;

@Component({
  selector: 'update-component',
  templateUrl: './update.html'
})
export class UpdateComponent implements OnInit, OnDestroy, AfterViewInit {
  public isSubmitted: boolean = false;
  private userLoadedSubscription: Subscription;
  public info: any = {

    country: '',
    state: '',
    city: ''
  };
  public verificationCode: number;
  public avatarOptions: any = {};
  public avatarUrl: any = '';
  private phoneNumber: any = '';
  public isVerified: boolean = false;
  public emailExists: boolean = true;
  public phoneExists = true;
  public countries: any[] = [];
  public cities: any[] = [];
  public states: any[] = [];
  public timezone = 'America';

  @ViewChild('phoneverificationmodal') verificationmodal: ElementRef;
  @ViewChild('ngxIntlTelInput') ngxIntlTelInput: ElementRef;
  @ViewChild('frm') form: NgForm;

  constructor(private translate: TranslateService,
    private router: Router,
    private authService: AuthService,
    private toasty: ToastyService,
    private utilService: UtilService,
    private locationService: LocationService,
    private modalService: NgbModal,
    private phoneService: PhoneService
  ) {
    this.authService.me().then((resp) => {
      this.info = resp.data;
      if (this.info.country) {
        this.info.country = this.info.country.charAt(0).toUpperCase() + this.info.country.slice(1);
        this.info.state = this.info.state.charAt(0).toUpperCase() + this.info.state.slice(1);
        this.info.city = this.info.city.charAt(0).toUpperCase() + this.info.city.slice(1);
      } else {
        this.getBrowserLocation();
      }

      this.info.name = this.info.name ?  this.info.name : 'User-'+ Math.floor(100000 + Math.random() * 900000)
      
      this.avatarUrl = resp.data.avatarUrl;
      if (this.timezone === 'America') {

        this.info.phoneNumber = resp.data.phoneNumber.replace('+1', '');
        this.phoneNumber = this.info.phoneNumber;
        this.isVerified = resp.data.phoneVerified;

      } else {
        this.info.phoneNumber = resp.data.phoneNumber;
        this.phoneNumber = this.info.phoneNumber;
        this.isVerified = resp.data.phoneVerified;

      }

      this.showPrefilledCountriesAndStates();

      if (!this.info.email) {
        this.emailExists = false;
      } else if (!this.info.phoneNumber) {
        this.phoneExists = false;
        this.isVerified = false;
      }


    });

    this.locationService.countries().then((resp) => {
      this.countries = resp.data;
    });

    this.userLoadedSubscription = authService.userLoaded$.subscribe(data => this.info = data);
  }


  async getBrowserLocation() {
    let location = {};
    navigator.geolocation.getCurrentPosition(async (resp) => {
      location = {
        'latitude': resp.coords.latitude,
        'longitude': resp.coords.longitude
      }
      this.locationService.getLocation({ 'latitude': location['latitude'], 'longitude': location['longitude'] }).then((resp) => {
        this.info.country = this.info.country ? this.info.country : resp.data[0]['country'];
        this.info.zipCode = this.info.zipcode ? this.info.zipcode :resp.data[0]['zipcode'];
        this.info.city = this.info.city ? this.info.city : resp.data[0]['city'];
        this.info.state = this.info.state ? this.info.state : resp.data[0]['administrativeLevels']['level1long'];
        this.loadStates(this.info.country, true);

      })
        .catch((err) => {
          console.log(err);
        });

      }, error => {
        this.locationService.getIPAddress().subscribe((res: any) => {
          this.locationService.getIpLocation(res).then(res => {
            location = {
              'latitude': res.data.data.location.ll[0],
              'longitude': res.data.data.location.ll[1]
            }    
              
            this.locationService.getLocation({'latitude' : location['latitude'] , 'longitude' : location['longitude']}).then((resp) => {
              this.info.country = this.info.country ? this.info.country : resp.data[0]['country'];
              this.info.zipCode = this.info.zipcode ? this.info.zipcode :resp.data[0]['zipcode'];
              this.info.city = this.info.city ? this.info.city : resp.data[0]['city'];
              this.info.state = this.info.state ? this.info.state : resp.data[0]['administrativeLevels']['level1long'];
              this.loadStates(this.info.country, true);
          
            })
          })  
        })
      })
    }

  ngOnInit() {

      this.avatarOptions = {
        url: window.appConfig.apiBaseUrl + '/users/avatar',
        fileFieldName: 'avatar',
        onFinish: (resp) => {
          this.avatarUrl = resp.data.url;
          this.info.avatarUrl = resp.data.url;
        }
      }

    this.phoneService.getTimezone().then((res: any) => { this.timezone = res.timezone }).catch(err => { console.log(err) })


  }
  
  ngAfterViewInit() {}

 
  ngOnDestroy() {
      this.userLoadedSubscription.unsubscribe();
    }

  submit(frm: any) {
      this.isSubmitted = true;
      if(!frm.valid) {
      return this.toastError()
    }

    if(this.info.phoneNumber) {
      if ((this.info.phoneNumber).match(reOtherPhone) && this.timezone === 'Other') {
        this.info.phoneNumber = this.info.phoneNumber[0] === '+' ? this.info.phoneNumber : '+' + this.info.phoneNumber
      } else if ((this.info.phoneNumber).match(reAmericaPhone) && this.timezone === 'America') {
        this.info.phoneNumber = this.info.phoneNumber.replace('+1', '');

      } else {
        if (this.timezone === 'America') {
          return this.toasty.error('Please enter 10 digit phone number');
        } else {
          return this.toasty.error('Please enter phone number with country dial code');
        }
      }
  
      this.info.phoneVerified = this.isVerified
      if (!this.info.phoneVerified) {
        return this.toasty.error(this.translate.instant('Phone verification is pending!'));
      }
  
    }

    
    let doUpdate = false;

    if (this.info.phoneNumber) {
      doUpdate = true;
    } else {
      this.info.phoneVerified = false;
    }

    if (this.info.email) {

      if (!(this.info.email).match(reEmail)) {
        return this.toasty.error('Please enter a valid Email');
      }

      if (this.info.emailVerified) {
        doUpdate = true;
        
      } else {
        return this.toasty.error('Please verify your email')
      }
    }

    if (!doUpdate) {
      return this.toasty.error('Please enter email or Phone!');
    }


    if (!this.info.email && !this.info.phoneNumber) {
      return this.toasty.error('Please eneter a valid email or phone number')
    }



    this.authService.updateMe(this.info).then(resp => {
      this.toasty.success(this.translate.instant('Updated successfuly!'));
      this.phoneNumber = this.info.phoneNumber
      this.utilService.changesDetect.next(true);
      this.emailExists = true;
      this.router.navigate(['/']);

    }).catch((err) => {
      this.toasty.error(err.data.data.message)
    });
  }

  public onlyNumberKey(event) {
    return (event.charCode == 8 || event.charCode == 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  verifyEmail(email) {

    if (!(email).match(reEmail)) {
      return this.toasty.error('Please enter a valid Email');
    }

    this.authService.verifyEmail({ "email": email, "id": this.info._id }).then(res => {
      this.toasty.success('Please check your email we have send you email verify email');
      const modalRef = this.modalService.open(EmailVerifyModalComponent, {
        size: 'md' // TODO - custom class here for larger screen
      });

      modalRef.componentInstance.id = this.info._id;
      modalRef.result.then(result => {
        this.emailExists = true;
        this.info.emailVerified = true;
      });
    }).catch(err => {
      console.log(err)
      this.toasty.error("This Email Address is Already Taken.")
    })


  }


  loadStates(country: any, change = false) {
    if (!country) {
      return
    }
    country = country.charAt(0).toUpperCase() + country.slice(1);
    let COD = this.countries.filter(c => c.name.toLowerCase() === country.toLowerCase())[0].isoCode;
    this.locationService.states({ country: COD }).then((res) => {
      this.states = res.data;

      if (change === true && this.info.state) {
        this.info.state = this.info.state.replace(/\b\w/g, l => l.toUpperCase());
        this.loadCities(this.info.state, true)
      } else {
        this.loadCities(this.states[0].name);
        this.info.state = this.states[0].name;
      }
    });
  }

  loadCities(state: any, change = false) {
    state = state.charAt(0).toUpperCase() + state.slice(1);

    let id = this.states.filter(s => s.name === state)[0]._id;
    this.locationService.cities({ state: id }).then((res) => {
      this.cities = res.data;

      if (change === true && this.info.city) {

      } else {
        this.info.city = (this.cities[0].name);
      }
    });
  }

  showPrefilledCountriesAndStates() {
    let country = this.info.country;

    setTimeout(async () => {
      this.loadStates(country, true);
    }, 1000)

  }

  changePhoneNumber(ev) {
    if (ev && ev !== '') {
      let newph = ev;
      if (newph != this.phoneNumber) {
        this.isVerified = false
      } else this.isVerified = true
    } else this.isVerified = false
  }

  onVerifyApprove(ev) {
    if (ev == true) {
      this.isVerified = true
    } else this.isVerified = false
  }

  toastError() {
    this.toasty.error(this.translate.instant('Something went wrong, please check and try again!'))
  }

}
