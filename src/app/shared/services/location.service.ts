import { Injectable } from '@angular/core';
import { Restangular } from 'ngx-restangular';
import { HttpClient  } from '@angular/common/http';
import 'rxjs/add/operator/toPromise';
import * as _ from 'lodash';
import { Observable } from 'rxjs/Rx';

@Injectable()
export class LocationService {
  constructor(private restangular: Restangular, private http: HttpClient) { }
  countries(): Promise<any> {
    return this.restangular.one('countries').get().toPromise();
  }

  states(params: any): Promise<any> {
    return this.restangular.one('states').get(params).toPromise();
  }

  cities(params: any): Promise<any> {
    return this.restangular.one('cities').get(params).toPromise();
  }


  getLocation(params: any): Promise<any> {
    return this.restangular.all('users/location').post(params).toPromise();
  }

  getIPAddress(): Observable<any>  {  
    return this.http.get("https://api.ipify.org/?format=json");   
  }  

  getIpLocation(ip) :Promise<any> {
    return this.restangular.all('auth/getIp').post(ip).toPromise();
  }  
}
