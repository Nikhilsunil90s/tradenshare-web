import { Component, OnInit, Input, ViewChild, ElementRef, AfterViewInit, Renderer2, OnChanges } from '@angular/core';
import { NgbActiveModal, NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { ToastyService } from 'ng2-toasty';
import { MessageService } from '../../services/message.service';
import { AuthService } from '../../../shared/services';
import { ConversationService } from '../../services/conversation.service';
import { TranslateService } from '@ngx-translate/core';

@Component({
  selector: 'send-message-btn',
  template: '<button class="btn-add-cart" translate (click)="sendMessage()">Send message</button>'
})
export class SendMessageButtonComponent implements AfterViewInit {
  @Input() recipientId: string;

  

  constructor(private toasty: ToastyService, private modalService: NgbModal,
    private authService: AuthService, private translate: TranslateService,
    private conversationService: ConversationService) {

  }


  ngAfterViewInit () {
  }

  sendMessage() {
    if (!this.authService.isLoggedin()) {
      return this.toasty.error(this.translate.instant('Please login to send message'));
    }
    this.conversationService.create(this.recipientId)
      .then((resp) => {
        const modalRef = this.modalService.open(MessageMessageModalComponent, {
          backdrop: 'static',
          keyboard: false
        });
        modalRef.componentInstance.conversation = resp.data;
        modalRef.componentInstance.open = true;


        modalRef.result.then(result => {
          if (!result) {
            this.toasty.success(this.translate.instant('Your message has been sent'));
          }
        }, () => { });
      }).catch((err) => {
        console.log(err)
        this.toasty.error(this.translate.instant('You can not send messages to yourself'))
      });

  }
}

@Component({
  templateUrl: './send-message-modal.html'
})
export class MessageMessageModalComponent implements OnInit {
  @Input() conversation: any;
  @ViewChild('messageBox') messageBox: ElementRef;
  public message: any = {
    text: ''
  };
  public submitted: boolean = false;

  @Input() set open(value: boolean) {
    if (value) {
      document.getElementById('text-area').focus()
      
    }
  }

  constructor(
    private service: MessageService,
    public activeModal: NgbActiveModal,
    private toasty: ToastyService,
    private translate: TranslateService,
    private renderer: Renderer2
  ) {
  }

  ngOnInit() { 
    
    
  }


  submit(frm: any) {
    this.submitted = true;
    if (frm.invalid) {
      return;
    }

    if (!this.message.text) {
      return this.toasty.error(this.translate.instant('Please enter message'))
    }

    this.service.send({
      conversationId: this.conversation._id,
      type: 'text',
      text: this.message.text
    })
      .then(() => this.activeModal.close());
  }
}