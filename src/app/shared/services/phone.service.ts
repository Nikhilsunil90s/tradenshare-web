import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';
import 'rxjs/add/operator/toPromise';

const rePhone = /(\d{1,2}[.-\s]?)(\d{3}[.-]?){2}\d{4}/g;

@Injectable({
  providedIn: 'root',
})
export class PhoneService {
  

  getTimezone() {
    const today = new Date();
    const short = today.toLocaleDateString(undefined);
    const full = today.toLocaleDateString(undefined, { timeZoneName: 'long' });


    return new Promise((resolve,reject) => {
      const shortIndex = full.indexOf(short);
      if (shortIndex >= 0) {
        const trimmed = full.substring(0, shortIndex) + full.substring(shortIndex + short.length);
        
        let fullTimezone = trimmed.replace(/^[\s,.\-:;]+|[\s,.\-:;]+$/g, '');
        let timezonesSplit = fullTimezone.split(' ');
        let timezone = '';
  
        for(let i=0; i<timezonesSplit.length; i++) {
          timezone += timezonesSplit[i][0];
        }
  
        if(timezone === 'PST' || timezone === 'PDT' || timezone === 'MST' || timezone === 'MDT' || timezone === 'CST' || timezone === 'CDT' || timezone === 'EST' || timezone === 'EDT' || timezone === 'AST' || timezone === 'ADT' || timezone === 'NST' || timezone === 'NDT' ||  timezone === 'AKDT' || timezone === 'AKST' || timezone === 'HADT' || timezone === 'HAST' || timezone === 'ChST' || timezone === 'SST'  ) {
          resolve({
            timezone: 'America'
          })
        } else {
          resolve({
            timezone: 'Other'
          })
        }
      }
    })
    

    
  }


  normalize(value) {
    return new Promise((resolve,reject) => {
      resolve(value.replace(/[^0-9]/g, ""));
    })
  }
}
