import { Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';
import { Router } from '@angular/router';
import { NgbActiveModal } from '@ng-bootstrap/ng-bootstrap';
import { TranslateService } from '@ngx-translate/core';
import { ToastyService } from 'ng2-toasty';
import { CategoryService, ProductService, ProducttypeService } from '../../../../product/services';


@Component({
  selector: 'product-modal',
  templateUrl: 'product-modal.component.html'
})
export class ProductModalComponent {
  
  public tree: any[] = [];
  public productType: any[] = [];
  public tab = 'info';
  public images: any = [];

  public product: any = {
    name: '',
    description: '',
    mainImage: null,
    type: 'physical',
    categoryId: '',
    producttypeId: '',
    price: 0,
    salePrice: 0,
    isActive: true,
    productType: '',
    zipcode: '',
    publish: true,
    notification: true
  };

  public imagesOptions: any = {
    multiple: true,
    count: 0
  };
  public mainImage: string = '';
  isSubmitted: boolean = false;
  private zipcode = '';

  constructor(
    private categoryService: CategoryService,
    private producttypeService: ProducttypeService, 
    private toasty: ToastyService,
    public activeModal: NgbActiveModal,
    private productService: ProductService) {

    this.categoryService.tree()
    .then(resp => {
      this.tree = resp;
    }).catch(err => {
      console.log(err)
    });


    this.producttypeService.findForDropdown()
    .then((resp) => {
        this.productType = resp.data;
    });
  }


  changeTab(tab: string) {
    this.tab = tab;
  }

  setMain(media: any) {
    this.mainImage = media._id;
  }

  removeImage(media: any, index: any) {
    if (media._id === this.mainImage) {
      this.mainImage = null;
    }
    this.images.splice(index, 1);
    this.imagesOptions.count -= 1; 
  }


  selectImage(media: any) {    
    if (media.type !== 'photo') {
      return this.toasty.error('Please select image!');
    } 
    this.imagesOptions.count += 1; 
    this.images.push(media);
  }

  changeAlias() {
    this.product.alias = this.product.name.split(' ').join('-');;
  }

  submit(frm: any) {
    this.isSubmitted = true;
    if (frm.invalid) {
      return this.toasty.error('Form is invalid, please try again.');
    }
    
    this.product.images = this.images.map(i => i._id);
    this.product.mainImage = this.mainImage || null;

    this.product.zipcode = this.zipcode;
    this.product.salePrice = this.product.price;
    this.productService.create(this.product)
      .then(() => {
        this.toasty.success('Product has been created');
        this.activeModal.close(true);
      }, err => this.toasty.error(err.data.message || 'Something went wrong!'));
  }
}

