import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../shared/services';
import { TranslateService } from '@ngx-translate/core';
import { ToastyService } from 'ng2-toasty';

@Component({
  //templateUrl: 'login.component.html'
})
export class AutoLoginComponent {
  private Auth: AuthService;
  public credentials = {
    email: '',
    token: ''
  };
  public submitted: boolean = false;

  constructor(
    auth: AuthService, 
    public router: Router, 
    private translate: TranslateService, 
    private toasty: ToastyService,
    private route: ActivatedRoute
    ) {
    this.Auth = auth;
    
    let token = this.route.snapshot.paramMap.get('token');
    if(token && token != ''){
        this.Auth.getUserByToken(token).then((resp) => {
          
          this.router.navigate(['/']);

        }).catch((err) => {
          this.router.navigate(['/']);
        });
    }

  }

  
}
