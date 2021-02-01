import { Routes } from '@angular/router';
import { FullComponent } from './layouts/full/full.component';

import { AuthGuard } from './shared/guard/auth.guard';
import { ProfileGuard } from './shared/guard/profile.guard';
import { ConfigResolver } from './shared/resolver';

export const Approutes: Routes = [
  {
    path: '',
    component: FullComponent,
    resolve: { appConfig: ConfigResolver },
    children: [
      { path: '', canActivate: [ProfileGuard], loadChildren: './starter/starter.module#StarterModule' },
      { path: 'payment', canActivate: [ProfileGuard], loadChildren: './payment/payment.module#PaymentModule' },
      { path: 'contact', canActivate: [ProfileGuard], loadChildren: './contact/contact.module#ContactModule' },
      { path: 'page', canActivate: [ProfileGuard], loadChildren: './static-page/static-page.module#StaticPageModule' },
      { path: 'products', canActivate: [ProfileGuard], loadChildren: './product/product.module#ProductModule' },
      { path: 'shops', canActivate: [ProfileGuard], loadChildren: './shop/shop.module#ShopModule' },
      {
        path: 'profile',
        canActivate: [AuthGuard],

        loadChildren: './profile/profile.module#ProfileModule'
      },
      { path: 'cart', canActivate: [ProfileGuard], loadChildren: './cart/cart.module#CartModule' },
      {
        path: 'orders',
        canActivate: [AuthGuard, ProfileGuard],
        loadChildren: './order/order.module#OrderModule'
      },
      {
        path: 'donations',
        canActivate: [AuthGuard, ProfileGuard],
        loadChildren: './buy-us-a-coffee/buy-us-a-coffee.module#BuyUsACoffeeModule'
      },
      {
        path: 'messages',
        canActivate: [AuthGuard, ProfileGuard],
        loadChildren: './message/message.module#MessageModule'
      }
    ]
  },
  {
    path: 'auth',
    component: FullComponent,
    resolve: { appConfig: ConfigResolver },
    children: [
      { path: '', loadChildren: './auth/auth.module#AuthModule' }
    ]
  },
  {
    path: '**',
    redirectTo: '/'
  }
];
