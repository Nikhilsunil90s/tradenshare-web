import { Component, OnDestroy, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { SeoService, CartService, AuthService } from '../../../shared/services';
import { ProductVariantService, ProductService } from '../../services';
import { WishlistService } from '../../../profile/services';
import { ToastyService } from 'ng2-toasty';
import { TranslateService } from '@ngx-translate/core';
import { ShareButtons } from '@ngx-share/core';
import { Subscription } from 'rxjs/Subscription';
//import {NgbDateStruct, NgbCalendar} from '@ng-bootstrap/ng-bootstrap';
import {NgbDateStruct, NgbCalendar, NgbDateParserFormatter, NgbDate} from '@ng-bootstrap/ng-bootstrap';
import * as moment from 'moment';
import { ToastrService } from 'ngx-toastr';
import { UtilService } from '../../../shared/services';
import { isSet, result } from 'lodash';
import {FormControl, FormsModule} from '@angular/forms';

@Component({
  templateUrl: './detail.html'
})
export class ProductDetailComponent implements OnDestroy , OnInit {
  public product: any;
  public discount: any = 100;
  public discountVal: any = 100;
  public variants: any = [];
  public isVariant: any = false;
  public tab: any = 'detail';
  public selectedVariant: any;
  public page: any = 1;
  public quantity: any = 1;
  public activeSlide: any = {};
  public slidePosition: any = 0;
  private productSubscription: Subscription;
  public slideConfig: any = {
    'slidesToShow': 5,
    'slidesToScroll': 5
  };
  public vatBasePrice:any = 0;
  public vatSalePrice:any = 0;
  public basePrice:any = 0;
  public price: any = 0;
  public pricePerHour: any = 0;
  public pricePerDay: any = 0;
  public pricePerWeek: any = 0;
  public pricePerMonth: any = 0;
  public salePrice: any = 0;
  public stockQuantity: any = 0;
  public isShowVar: any = false;
  public userID: any;
  public fromDate: any;
  public toDate: any;
  public isProductRentAndShare = false;
  model: NgbDateStruct;
  today = this.calendar.getToday();
  placement = 'bottom';
  public isProductAvailableOnDateRange: boolean = true;
  public isCheckoutDisbale:boolean = false;
  public minDate:any;
  public maxDate:any;
  public disabledDates:NgbDateStruct[];
  public rentDurationText: string = '';
  public zipcode = '';
  public deliverable:boolean = false;
  public deliveryStatus: boolean = false;
  /*public startTime: any = {};
  public endTime: any = {};*/
  public sTime = {hour:0, minute:0};
  public eTime = {hour:0, minute:0};
  public startTime: any = {hour:12, minute:0};
  public endTime: any = {hour:12, minute:0};
  spinners = false;
  public priceType: any = 1;

  constructor(private translate: TranslateService, private route: ActivatedRoute,
    private authService: AuthService, private seoService: SeoService, 
    private variantService: ProductVariantService,
    private productService: ProductService,
    public share: ShareButtons, 
    private wishlistService: WishlistService, 
    private toasty: ToastyService,
    private cartService: CartService,
    private calendar: NgbCalendar,
    private formatter: NgbDateParserFormatter,
    private toastr: ToastrService,
    private utilService: UtilService,
    private router: Router) {
    if (this.authService.isLoggedin()) {
      this.authService.getCurrentUser().then(res => this.userID = res._id);
    }

    
    /*this.startTime.hour = new Date().getHours();
    this.startTime.minute = new Date().getMinutes();*/

    this.product = route.snapshot.data.product;

    if (this.product.shop && this.product.shop.gaCode) {
      seoService.trackPageViewForShop(this.product.shop._id, this.product.shop.gaCode);
    }
    this.productSubscription = this.route.data.subscribe(data => {
      this.product = data.product;
      
      
      if(!this.product.transactiontype){
        this.isProductAvailableOnDateRange = true;
        this.isCheckoutDisbale = false;
      }
      else if((this.product.transactiontype.name == 'Rent' || this.product.transactiontype.name == 'Share')){
        this.isProductAvailableOnDateRange = false;
        this.isCheckoutDisbale = true;
        this.isProductRentAndShare = true;
        this.minDate = {year: moment(this.product.startDate).year(), month: moment(this.product.startDate).month()+1, day: moment(this.product.startDate).date()};
        this.maxDate = {year: moment(this.product.endDate).year(), month: moment(this.product.endDate).month()+1, day: moment(this.product.endDate).date()};
        
      }
      this.updateSeo();
      this.selectedVariant = {};
      this.isVariant = false;
      this.quantity = 1;
      if(this.product.salePrice > 0 && !this.isProductRentAndShare){
        this.basePrice = this.product.price;
        this.salePrice = this.product.salePrice
      } else{
        this.basePrice = this.product.price;
      }

      this.pricePerDay = this.product.price;
      this.pricePerHour = this.product.pricePerHour;
      this.pricePerWeek = this.product.pricePerWeek;
      this.pricePerMonth = this.product.pricePerMonth;

      console.log(this.product)
      /*if (this.product.images.length) {
        this.activeSlide = this.product.images[0];
      } else if (!this.product.images.length && this.product.mainImage.length) {
        alert(this.product.mainImage);
        this.activeSlide = this.product.mainImage;
      }*/

      this.setPrice(this.product);
      this.getVariants();
      this.getProductBookedDate();

    });

    

    this.disabledDates = [];
  }

  ngOnInit() {
    
  }

  isDisabled=(date:NgbDateStruct,current: {month: number,year:number})=> {
    //in current we have the month and the year actual
    return this.disabledDates.find(x=>new NgbDate(x.year,x.month,x.day).equals(date))?true:false;
  }

  
  isBooked = (date: NgbDate) =>  {
    return this.disabledDates.find(x=>new NgbDate(x.year,x.month,x.day).equals(date))?true:false;
  };

  areaCheck() {
    if(this.zipcode.trim().length <= 0) {
      return this.toasty.error(this.translate.instant('Please Enter Zipcode'));
    }
    this.productService.areaAvailibility(this.zipcode, this.product.location.coordinates, this.product.distance)
      .then((result) => {
        this.deliveryStatus = true;
        if(result.data.distance.code === 200 ) {
            this.deliverable = true;
            this.enableCheckoutForRentAndShare();
        } else {
          this.deliverable = false;
          this.enableCheckoutForRentAndShare();
        }
      })
      .catch(err => {
          return this.toasty.error(this.translate.instant('Please Enter Correct Zip code'));
      })

  }

  updateSeo() {
    let image = '';
    if (this.product.mainImage) {
      image = this.product.mainImage.mediumUrl;
    } else if (this.product.images.length) {
      image = this.product.images[0].mediumUrl;
    }
    this.seoService.update(this.product.name, this.product.metaSeo, image);
  }

  openVariant() {
    this.isShowVar = !this.isShowVar;
  }

  ngOnDestroy() {
    this.productSubscription.unsubscribe();
  }

  setPrice(product: any) {

    if(this.priceType  == 2){
      this.toDate = this.fromDate;
    }
    if(typeof this.fromDate !== 'undefined' && typeof this.toDate !== 'undefined'){
      product.price = this.calculateProductPrice();
      this.basePrice = product.price;
    }
    
    
    if(!this.isProductRentAndShare){

      this.vatSalePrice = product.salePrice * this.product.taxPercentage / 100 || 0;
      this.vatBasePrice = product.price * this.product.taxPercentage / 100 || 0;

      this.salePrice = product.salePrice + this.vatSalePrice || product.salePrice;
    } else {

      this.vatSalePrice = this.basePrice * this.product.taxPercentage / 100 || 0;
      this.vatBasePrice = this.basePrice * this.product.taxPercentage / 100 || 0;
      this.salePrice = this.basePrice + this.vatSalePrice || this.basePrice;
    }

    this.price = product.price + this.vatBasePrice || product.price;
    
    //This is for rental price calculation
    if((typeof this.fromDate !== 'undefined' && typeof this.toDate !== 'undefined') || this.isProductRentAndShare){
      if(product.depositAmont){
        this.price = this.price + product.depositAmont;
        this.salePrice = this.price;
      }
    }

    this.discountVal = this.price ? ((this.price - this.salePrice) / this.price * 100).toFixed(2) : 0;
    this.stockQuantity = product.stockQuantity;
  }

  getVariants() {
    this.variantService.search(this.product._id, { take: 100 }).then((resp) => {
      this.variants = resp.data.items;
    });
  }

  changeSlide(index: number) {
    this.slidePosition = index;
    this.activeSlide = this.product.images[index];
  }

  selectVariant(val: any, index: any) {
    if (this.selectedVariant && this.selectedVariant === val) {
      this.isVariant = false;
      this.selectedVariant.isSelected = false;
      this.setPrice(this.product);
      this.selectedVariant = {};
      return;
    }
    this.isVariant = true;
    if (this.selectedVariant) {
      this.selectedVariant.isSelected = false;
    }
    this.selectedVariant = val;
    this.variants[index].isSelected = true;
    this.setPrice(this.variants[index]);
  }

  addWishList(item: any) {
    if (!this.authService.isLoggedin()) {
      return this.toasty.error(this.translate.instant('Please login before adding to wishlist.'));
    }
    this.wishlistService.create({ productId: item._id })
      .then(resp => this.toasty.success(this.translate.instant('Added to wishlist successfully.')))
      .catch(err => this.toasty.error(err.data.data.message || this.translate.instant('Error occured, please try again later.')));
  }

  addCart() {
    if(this.isProductRentAndShare)
    {
        if(this.fromDate!='' && this.toDate!='' ){

          let startDate = this.formatter.format(this.fromDate);
          let endDate = this.formatter.format(this.toDate);

          if(this.priceType == 2){
            let startTime = this.startTime.hour+':'+this.startTime.minute;
            let endTime = this.endTime.hour+':'+this.endTime.minute;

            var fromDate = moment(startDate+' '+startTime);
            var toDate = moment(endDate+' '+endTime);
          } else {
            var fromDate = moment(startDate+' 00:00:00');
            var toDate = moment(endDate+' 23:59:59');
          }

          this.cartService.add({
            productId: this.isVariant ? this.selectedVariant.productId : this.product._id,
            productVariantId: this.isVariant ? this.selectedVariant._id : null,
            variant : this.isVariant ? this.selectedVariant : null,
            product: this.product,
            fromDate: fromDate,
            toDate: toDate,
            priceType: this.priceType
          }, this.quantity);
        } else {
          return this.toasty.error('please select Start Date and Start Time and End Date and End Time')
        }
    } else {

      if (!this.stockQuantity) {
        return this.toasty.error(this.translate.instant('This item is out of stock.'));
      }

      if (this.quantity > this.stockQuantity) {
        return this.toasty.error(this.translate.instant('Quantity is not valid, please check and try again!'));
      }
  
      this.cartService.add({
        productId: this.isVariant ? this.selectedVariant.productId : this.product._id,
        productVariantId: this.isVariant ? this.selectedVariant._id : null,
        variant : this.isVariant ? this.selectedVariant : null,
        product: this.product,
        fromDate: '',
        toDate: '',
        priceType:''
      }, this.quantity);  
    }
    
    //This is for Renter and Shared
    if(this.isProductRentAndShare){
      this.router.navigate(['/cart/checkout']);
    }
    
  }


  onlyNumberKey(event) {
    return (event.charCode === 8 || event.charCode === 0) ? null : event.charCode >= 48 && event.charCode <= 57;
  }

  onStartTimeChange(value:{hour:string,minute:string})
  {
    this.startTime.hour = `${value.hour}`;
    this.startTime.minute = `${value.minute}`;
  }

  onEndTimeChange(value:{hour:string,minute:string})
  {
    this.endTime.hour = `${value.hour}`;
    this.endTime.minute = `${value.minute}`;
  }


  onAvailableChange(event){
    
    let startDate = this.formatter.format(this.fromDate);
    let endDate = this.formatter.format(this.toDate);
    
    
    if(this.priceType == 1){
      var startTime = '00:00:00';
      var endTime = '23:59:59';
      var fromDate = moment(startDate+' '+startTime);
      var toDate = moment(endDate+' '+endTime
      
      );
    } else {
      
      var startTime = this.startTime.hour+':'+this.startTime.minute;
      var endTime = this.endTime.hour+':'+this.endTime.minute;
      endDate = startDate;
      var fromDate = moment(startDate+' '+startTime);
      var toDate = moment(startDate+' '+endTime);
    }

    if(startDate!='' && endDate !='')
    {
      if(!toDate.isSameOrAfter(fromDate)){
        return this.toasty.error(this.translate.instant('To date is grater then from date'));
      }
      else {
        this.utilService.setLoading(true);
        let param = {'alias':this.product.alias, 'startDate': startDate, 'endDate': endDate, 'startTime': startTime, 'endTime': endTime}
        this.productService.checkProductAvailability(param).then((resp) => {
        if(!resp.data){
            this.isProductAvailableOnDateRange = false;
            this.enableCheckoutForRentAndShare();
            return this.toasty.error(this.translate.instant('Product is not available for this dates.'));
          } else {

            //This is to get date different
            this.product.price = this.pricePerDay;
            this.setPrice(this.product);
            this.isProductAvailableOnDateRange = true;
            this.enableCheckoutForRentAndShare();
          }
        });
        this.utilService.setLoading(false);
      }
    } 
  }

  enableCheckoutForRentAndShare(){
    if(this.isProductRentAndShare){
      if(this.deliverable == true && this.isProductAvailableOnDateRange == true){
        this.isCheckoutDisbale = false;
      } else {
        this.isCheckoutDisbale = true;
      }
    }
  }


  calculateProductPrice(){
    let startDate = this.formatter.format(this.fromDate);
    let endDate = this.formatter.format(this.toDate);
    
    if(this.priceType == 1){
      let startTime = '00:00:00';
      let endTime = '23:59:59';
      var fromDate = moment(startDate+' '+startTime);
      var toDate = moment(endDate+' '+endTime).add(1, 'day');
    } else {
      
      endDate = startDate;
      let startTime = this.startTime.hour+':'+this.startTime.minute+':00';
      let endTime = this.endTime.hour+':'+this.endTime.minute+':00';
      var fromDate = moment(startDate+' '+startTime);
      
      var toDate = moment(endDate+' '+endTime);
    }

    /*var toDate = moment(endDate+' '+endTime).add(1, 'day');*/
    var diff = moment.duration(toDate.diff(fromDate));
    var price = 0;
    var month = diff.months();
    var week = diff.weeks();
    var days = ((diff.days())%7);
    var hours = 0;
    if(this.priceType == 2){
      hours = Math.ceil(diff.asHours() - (diff.days()*24));
    } 
    

    if(month > 0){
      price += month*this.product.pricePerMonth;
      //console.log("Price 1"+price);
    }
    if(week > 0){
      price += week*this.product.pricePerWeek;
      //console.log("Price 2"+price);
    }
    if(days > 0){
      price += days*this.product.price;
      //console.log("Price 3"+price);
    }
    if(hours > 0){
      price += hours*this.product.pricePerHour;
      //console.log("Price 3"+price);
    }

    //This is for text duration
    let duration = '';
    if(month > 0){
      if(month == 1){
        duration += month+" Month ";
      } else{
        duration += month+" Months ";
      }
    }
    if(week > 0){
      if(week == 1){
        duration += week+" Week ";
      } else{
        duration += week+" Weeks ";
      }
    }

    if(days > 0){
      if(days == 1){
        duration += days+" Day ";
      } else{
        duration += days+" Days ";
      }
    }

    if(hours > 0){
      if(hours == 1){
        duration += hours+" Hour ";
      } else{
        duration += hours+" Hours ";
      }
    }

    this.rentDurationText = duration;


    /*console.log(price);
    console.log(month);
    console.log(week);
    console.log(days);*/
    return price;
  }

  getProductBookedDate() {
    this.utilService.setLoading(true);
    let param = {'alias':this.product.alias}
    this.productService.getProductOrders(param).then((resp) => {
      if(resp.data){
        var dateList = [];
        for (let order of resp.data){
          dateList = this.getDatesList(order.startDate, order.endDate);
          if(dateList){
            for (let date of dateList){
              this.disabledDates.push({year: moment(date).year(), month: moment(date).month()+1, day: moment(date).date()});  
            }
          }
        }
        
        console.log(this.disabledDates);
      }
    });
    this.utilService.setLoading(false);
  }

  getDatesList(startDate:any, stopDate:any) {
    var dateArray = [];
    var currentDate = moment(startDate);
    var endDate = moment(stopDate);
    while (currentDate <= endDate) {
        dateArray.push( moment(currentDate).format('YYYY-MM-DD') )
        currentDate = moment(currentDate).add(1, 'days');
    }
    return dateArray;
  }
}
