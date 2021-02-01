import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CartService, LocationService, PhoneService } from '../../../shared/services';
import { ToastyService } from 'ng2-toasty';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { CodVerifyModalComponent } from '../cod-verify-modal/cod-verify-modal.component';
import { OrderService } from '../../../order/services/order.service';
import { TransactionService } from '../../services/transaction.service';
import { CouponService } from '../../services/coupon.service';
import { AuthService } from '../../../shared/services';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';
import { StripeService, StripeCardComponent } from 'ngx-stripe';
import * as moment from 'moment';
import {
  StripeCardElementOptions,
  StripeElementsOptions
} from '@stripe/stripe-js';
import { TranslateService } from '@ngx-translate/core';
import * as _ from 'lodash';
import { ProductService } from '../../../product/services';
import { Observable } from 'rxjs';

@Component({
  templateUrl: './checkout.html'
})
export class CheckoutComponent implements OnInit {
  public cart: any = [];
  public totalPrice: any = 0;
  public totalTaxPrice: any = 0;
  public totalShippingPrice: any = 0;
  public totalDiscountPrice: any = 0;
  public totalDepositPrice: any = 0;
  public userInfo: any = {
    country: ''
  };
  public phoneNumber: any;
  public isSubmitted: any = false;
  public dialCode: any = '+1';
  public codCode: any = '';
  public orderId: any;
  public coupon: any = '';
  public countries: any = [];
  public states: any = [];
  public cities: any = [];

  public lastOrderDetails: any = '';

  @ViewChild(StripeCardComponent) card: StripeCardComponent;
  public cardHolderName: any = '';
  public cardOptions: any = {};
  // optional parameters
  public elementsOptions: StripeElementsOptions = {
    locale: 'en'
  };

  public stripeTest: FormGroup;
  public stripeToken: any = null;
  public paymentGateway: any;
  public isVerifyButton: boolean = false
  public isVerified: boolean = false;
  public timezone = 'America';

  constructor(private translate: TranslateService, private route: ActivatedRoute, private cartService: CartService,
    private orderService: OrderService, private transactionService: TransactionService,
    private toasty: ToastyService, private modalService: NgbModal, private couponService: CouponService,
    private locationService: LocationService,
    private productService: ProductService,
    private phoneService: PhoneService,
    private fb: FormBuilder, private stripeService: StripeService, private authService: AuthService) {
    const config = this.route.snapshot.data['appConfig'];

    if (this.authService.isLoggedin()) {
    this.phoneService.getTimezone().then((res: any) => { this.timezone = res.timezone}).catch(err=> { console.log(err)})

      this.authService.me().then((resp) => {
        if(this.userInfo.name) {
          this.userInfo.lastName = resp.data.name.slice(resp.data.name.indexOf(' ') + 1, resp.data.name.length);
          this.userInfo.firstName = resp.data.name.slice(0, resp.data.name.indexOf(this.userInfo.lastName) - 1);
  
        }
        this.userInfo.email = resp.data.email;
        this.userInfo.streetAddress = resp.data.address;

        if (this.timezone === 'America') {
          this.userInfo.phoneNumber = resp.data.phoneNumber.replace('+1', '');
          this.phoneNumber = this.userInfo.phoneNumber;
        } else {
          this.userInfo.phoneNumber = resp.data.phoneNumber;
          this.phoneNumber = this.userInfo.phoneNumber;

        }

        this.getLastOrderDetails(resp.data._id).then((res) => {
          if(Object.keys(res).length == 0) {
            this.userInfo.streetAddress = resp.data.streetAddress;
            this.userInfo.city = resp.data.city;
            this.userInfo.state = resp.data.state;
            this.userInfo.country = resp.data.country;
            this.userInfo.zipCode = resp.data.zipCode;
            this.userInfo.shippingAddress = resp.data.shippingAddress;
            this.loadStates(this.userInfo.country, true)
            setTimeout(() => {
                this.loadCities(this.userInfo.state, true)
            }, 1500);

          }
        }).catch((err) => { })
      });
    }

    this.paymentGateway = config.paymentGatewayConfig;
    if (!this.paymentGateway.cod.enable) {
      this.userInfo.paymentMethod = 'paypal';
      if (!this.paymentGateway.paypal.enable) {
        this.userInfo.paymentMethod = 'stripe';
      }
    }

    this.userInfo.userCurrency = config ? config.customerCurrency : 'USD';
  }

  ngOnInit() {
    this.cart = this.route.snapshot.data.cart;
    this.updateTotalPrice();
    console.log(this.cart);
    this.stripeService.setKey(window.appConfig.stripeKey);
    this.stripeTest = this.fb.group({
      cardName: ['', [Validators.required]]
    });
    this.locationService.countries().then(resp => this.countries = resp.data);
  }

  remove(index: number) {
    this.cartService.remove(this.cart.products[index]);
    this.cart.products.splice(index, 1);
    this.updateTotalPrice();
  }

  updateTotalPrice() {
    this.totalPrice = 0;
    this.totalTaxPrice = 0;
    this.totalShippingPrice = 0;
    this.totalDiscountPrice = 0;
    this.totalDepositPrice = 0;
    if (!this.cart) {
      return;
    }
    if (!this.cart.products.length) {
      return;
    }

    this.cart.products.forEach((product) => {
      if (product.quantity < 1) {
        product.quantity = 1;
      }

      product.calculatedData = {
        /*product: product.userProductPrice * product.quantity,*/
        product: product.userProductPrice,
        taxClass: product.taxClass,
        tax: 0,
        shipping: 0,
        discount: 0,
        depositAmont: (product.product.depositAmont > 0)?product.product.depositAmont:0
      };
      
      if (product && product.isDiscounted) {
        product.calculatedData.discount = product.discountPercentage * product.calculatedData.product / 100;
        this.totalDiscountPrice += product.calculatedData.discount;
      }
      if (product.taxPercentage && product.taxClass) {
        product.calculatedData.taxClass = product.taxClass;
        product.calculatedData.tax = product.calculatedData.product * (product.taxPercentage / 100);
        this.totalTaxPrice += product.calculatedData.tax;
      }

      // check resitrct for freeship area
      let freeShip = false;
      if (!product.freeShip) {
        _.each(product.restrictFreeShipAreas, (area) => {
          if (area.areaType === 'zipcode' && this.userInfo.zipCode && area.value.toLowerCase() === this.userInfo.zipCode.toLowerCase()) {
            freeShip = true;
          } else if (area.areaType === 'city' && this.userInfo.city && area.value.toLowerCase() === this.userInfo.city.toLowerCase()) {
            freeShip = true;
          } else if (area.areaType === 'state' && this.userInfo.state && area.value.toLowerCase() === this.userInfo.state.toLowerCase()) {
            freeShip = true;
          } else if (area.areaType === 'country' && this.userInfo.country && area.value.toLowerCase() === this.userInfo.country.toLowerCase()) {
            freeShip = true;
          }
        });
      }

      if (!freeShip && !product.freeShip && product.storeWideShipping) {
        let shipping = product.shippingSettings.defaultPrice;
        if (product.quantity > 1) {
          shipping += product.shippingSettings.perQuantityPrice * (product.quantity - 1);
        }
        product.calculatedData.shipping = shipping;
        this.totalShippingPrice += product.calculatedData.shipping;
      }

      product.calculatedData.total = product.calculatedData.product + product.calculatedData.tax + product.calculatedData.shipping - product.calculatedData.discount;
      if(product.product.transactiontype){
        if((product.product.transactiontype.name == 'Rent' || product.product.transactiontype.name == 'Share') && product.product.depositAmont > 0){
          product.calculatedData.total += product.product.depositAmont;
          if(product.product.depositAmont > 0){
            this.totalDepositPrice += product.product.depositAmont;
          }

        }
      }

      this.totalPrice += product.calculatedData.total;
    });
  }


  loadStates(country: any, change = false) {
    if(!country){
      return
    }
    country = country.charAt(0).toUpperCase() + country.slice(1);
    let COD = this.countries.filter(c => c.name === country)[0].isoCode;
    this.locationService.states({ country: COD }).then((res) => {
      this.states = res.data;
      let state = this.userInfo.state;
      
      if (change === true && this.userInfo.state) {
        this.loadCities(this.userInfo.state, true)
      } else {
        this.loadCities(this.states[0].name);
        this.userInfo.state = this.states[0].name;
      }
    });
  }

  loadCities(state: any, change = false) {
    state = state.charAt(0).toUpperCase() + state.slice(1);

    let id = this.states.filter(s => s.name === state)[0]._id;
    this.locationService.cities({ state: id }).then((res) => {
      this.cities = res.data;

      if (change === true && this.userInfo.city) {

      } else {
        this.userInfo.city = (this.cities[0].name);
      }
    });
  }


  submit(frm: any) {
    this.isSubmitted = true;
    if (frm.invalid) {
      return this.toasty.error(this.translate.instant('Please submit valid form'));
    }
    if (!this.userInfo.paymentMethod) {
      return this.toasty.error(this.translate.instant('Please select payment method'));
    }

    let error = false;
    if (!this.cart.products || !this.cart.products.length) {
      return this.toasty.error(this.translate.instant('Please add product to your cart!'));
    }
    this.cart.products.forEach((cart) => {
      if (cart.error) {
        error = true;
        return this.toasty.error(`${cart.product.name}` + this.translate.instant(' is out of stock'));
      }

      if(cart.product.transactiontype && cart.product.transactiontype.name !== 'Rent' && cart.product.transactiontype.name !== 'Share') {
        
        if (cart.quantity > cart.stockQuantity) {
          error = true;
          return this.toasty.error(`${cart.product.name}` + this.translate.instant(' just has ') +
            `${cart.stockQuantity}` + this.translate.instant(' in the stock'));
        }
      }
      

      if (this.userInfo.paymentMethod === 'cod') {
        const areas = cart.product.restrictCODAreas;
        const index = _.findIndex(areas, (a) => a.toString().trim().toLowerCase() === this.userInfo.zipCode.trim().toLowerCase());
        if (index > -1) {
          error = true;
          return this.toasty.error(`${this.userInfo.zipCode}` + this.translate.instant(' is not been supported for shipping.'));
        }
      }
    });

    if (error) {
      return;
    }


    if (this.userInfo.paymentMethod === 'cod') {
      if(this.isVerifyButton && !this.isVerified) {
        return this.toasty.error(this.translate.instant('Phone verification is pending!'));
      } else {
        this.doPost();
      }
    } else if (this.userInfo.paymentMethod === 'stripe') {
      const name = this.stripeTest.get('cardName').value;
      if (!name) {
        return this.toasty.error(this.translate.instant('Please enter card holder name!'));
      }
      this.stripeService
        .createToken(this.card.getCard(), { name })
        .subscribe(result => {
          if (result.token) {
            // Use the token to create a charge or a customer
            // https://stripe.com/docs/charges
            this.stripeToken = result.token.id;
            this.doPost();
          } else if (result.error) {
            // Error creating the token
            this.toasty.error(this.translate.instant(result.error.message));
            //this.toasty.error(this.translate.instant('Something went wrong, please try again!'));
          }
        });
    } else {
      // TODO - implement me
      this.doPost();
    }
  }

  changePhoneNumber(ev) {
    this.isVerified = false
  }

  changepaymentmethod(e) {
    this.checkforCOD(e.target.value)
  }

  checkforCOD(value) {
    if(value == "cod") {
      this.isVerifyButton = true
    } else {
      this.isVerifyButton = false
     }
  }

  onVerifyApprove(ev) {
    if(ev == true) {
      this.isVerified = true
    } else this.isVerified = false;

    
  }


  doPost() {

    this.cart.products = this.cart.products.filter((item: any) =>{

        if(item.startDate) {
          item.startDate = moment(item.startDate).format("YYYY-MM-DD HH:mm:00");
        }
        if(item.endDate) {
          item.endDate = moment(item.endDate).format("YYYY-MM-DD HH:mm:00");
        }
        return item;
    });
    const products = this.cart.products.map(item => _.pick(item, ['productId','productVariantId', 'quantity', 'userNote', 'couponCode', 'startDate', 'endDate', 'priceType']));
    
    this.userInfo.phoneNumber = this.phoneNumber; 
    this.userInfo.phoneNumber = this.userInfo.phoneNumber[0] === '+' ? this.userInfo.phoneNumber : '+'+ this.userInfo.phoneNumber  

    let doCheckout = true;
    let showError = true;

    let confirmation = Observable.create(observer => {
      for (let i=0; i< this.cart.products.length; i++) {

        var product = this.cart.products[i];
        if(product.product.transactiontype){
          if(product.product.transactiontype && (product.product.transactiontype.name == 'Rent' || product.product.transactiontype.name == 'Share') && product.product.depositAmont > 0)
          {
              let coordinates = this.cart.products[i].product.location.coordinates
              let zipcode = this.userInfo.zipCode
              let distance = this.cart.products[i].product.distance
  
              this.productService
              .areaAvailibility(zipcode, coordinates, distance)
              .then((res: any) => {
                let result = res.data;
                if(result.distance.code !== 200) {
                  doCheckout = false;
                  this.cart.products[i].product.isAvailable = false;
                } else {
                  this.cart.products[i].product.isAvailable = true;
                }
              })
              .catch(err => {
                console.log(err)
                if(showError) {
                  observer.error(err.data.data.message)
                  showError = false;
                }
              })
            }
        }

        if (i === this.cart.products.length -1 )  {
          observer.next(true)
        }
        
      }
    })

    confirmation.subscribe(res => {
      if(!doCheckout) {
        this.toasty.error('Please Check above in Products list some of them are not Deliverable')
        return 
      } 

      this.cartService.checkout({
        products,
        firstName: this.userInfo.firstName,
        lastName: this.userInfo.lastName,
        email: this.userInfo.email,
        phoneNumber: this.userInfo.phoneNumber,
        streetAddress: this.userInfo.streetAddress,
        city: this.userInfo.city,
        state: this.userInfo.state,
        country: this.userInfo.country,
        shippingAddress: this.userInfo.shippingAddress,
        userCurrency: this.userInfo.userCurrency,
        phoneVerifyCode: this.userInfo.phoneVerifyCode,
        paymentMethod: this.userInfo.paymentMethod,
        zipCode: this.userInfo.zipCode
      })
        .then((resp) => {
          if (this.userInfo.paymentMethod === 'cod') {
            this.cartService.clean();
            window.location.href = '/cart/checkout/success';
          } else if (this.userInfo.paymentMethod === 'paypal') {
            this.transactionService.request({
              gateway: 'paypal',
              service: 'order',
              itemId: resp.data._id
            })
              .then(transactionResp => {
                window.location.href = transactionResp.data.redirectUrl;
              })
              .catch((err) => this.toasty.error(this.translate.instant('Something went wrong, please try again!')));
          } else if (this.userInfo.paymentMethod === 'stripe') {
            this.transactionService.request({
              gateway: 'stripe',
              service: 'order',
              itemId: resp.data._id,
              stripeToken: this.stripeToken
            })
              .then(res => {
                window.location.href = '/cart/checkout/success';
              })
              .catch((err) => this.toasty.error(this.translate.instant('Something went wrong, please try again!')));
          } else {
            window.location.href = '/cart/checkout/success';
          }
        })
        .catch(err => this.toasty.error(this.translate.instant('Something went wrong, please try again!')));
    },error => {
      console.log(error)
      this.toasty.error(error);
    })
    
    
  }

  onlyNumberKey(event) {
    return (event.charCode === 8 || event.charCode === 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  selectDial(event) {
    this.dialCode = event;
  }


  checkCoupon() {
    if (!this.coupon) {
      return this.toasty.error(this.translate.instant('Please enter coupon code!'));
    }
    let i = 0;
    this.cart.products.forEach(prod => {
      i++;
      this.couponService.check({ code: this.coupon, shopId: prod.shopId }).then(resp => {
        prod.isDiscounted = true;
        prod.discountPercentage = resp.data.discountPercentage;
        prod.couponCode = this.coupon;
        if (i === this.cart.products.length) {
          this.updateTotalPrice();
        }
      })
        .catch(() => {
          this.toasty.error(`Can not apply this coupon for product ${prod.product.name}!`);
        });
    });
  }

  getLastOrderDetails(userId: string): Promise<any> {
    return new Promise<any>((resolve, reject) => {
      this.orderService.getlastOrder({"customerId" : userId})
      .then(resp => {
        if(resp.data) {
          this.lastOrderDetails = resp.data;
          if(this.lastOrderDetails.streetAddress){
            this.userInfo.streetAddress = this.lastOrderDetails.streetAddress;
          }
          if(this.lastOrderDetails.city){
            this.userInfo.city = this.lastOrderDetails.city;
          }
          if(this.lastOrderDetails.state){
            this.userInfo.state = this.lastOrderDetails.state;
          }
          if(this.lastOrderDetails.country){
            this.userInfo.country = this.lastOrderDetails.country;
          }
          if(this.lastOrderDetails.zipCode){
            this.userInfo.zipCode = this.lastOrderDetails.zipCode;
          }

          if(this.lastOrderDetails.shippingAddress){
            this.userInfo.shippingAddress = this.lastOrderDetails.shippingAddress;
          }

          if(this.lastOrderDetails.paymentMethod) {
            this.userInfo.paymentMethod = this.lastOrderDetails.paymentMethod;
            this.checkforCOD(this.lastOrderDetails.paymentMethod)
          }
        }
        resolve(resp.data)
      }).catch((err) => {
        resolve({})
      });

    })

  }
}
