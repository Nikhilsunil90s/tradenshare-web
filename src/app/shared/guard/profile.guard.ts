import { Injectable } from '@angular/core';
import { CanActivate } from '@angular/router';
import { Router } from '@angular/router';
import { AuthService } from '../services';

@Injectable()
export class ProfileGuard implements CanActivate {

  constructor(private router: Router, private Auth: AuthService) { }

  canActivate() {
    if (!this.Auth.isLoggedin()) {
      return true;
    }

    // return this.Auth.getCurrentUser()
    //   .then(resp => {

    //     if (!resp.email || !resp.phoneNumber || !resp.name || !resp.gender || !resp.emailVerified) {
          
    //       this.router.navigate(['/profile/update']);
    //       return false;
    //     } else {
    //       this.Auth.profileCompleted.next(true);
    //       return true;
    //     }
        
    //   });
    return true
  }
}
