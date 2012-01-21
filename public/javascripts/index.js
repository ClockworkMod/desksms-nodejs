var page = new function() {
  this.longAgo = function(utc)
   {
      //Consider making more options?
      var theDate = new Date(utc);
      var diff = (new Date()).getTime() - theDate.getTime();
      var dayCount = Math.floor(diff / 86400000);
      var howLong = '';

      if (dayCount >= 14)
          howLong = sprintf('%s %s ago', Math.floor(dayCount / 7), 'weeks');
      else if (dayCount > 1)
          howLong = sprintf('%s %s ago', dayCount, 'days');
      else if (dayCount == 1)
          howLong = '1 day ago';
      else
      {
          //hours
          if (Math.floor(diff / 3600000) > 2)
              howLong = sprintf('%s %s ago', Math.floor(diff / 3600000), 'hours');
          // More than an hour
          else if (diff / 3600000.0 > 1.5)
              howLong = 'Over an hour ago';
          else if (Math.floor(diff / 3600000) == 1)
              howLong = '1 hour ago';
          //minutes
          else if (Math.floor(diff / 60000) >= 1)
              howLong = sprintf('%s %s ago', Math.floor(diff / 60000), 'minutes');
          else if (Math.floor(diff / 60000) == 1)
              howLong = '1 minute ago';
          else if (Math.floor(diff / 1000) > 10)
              howLong = sprintf('%s %s ago', Math.floor(diff / 1000), 'seconds');
          //Just now
          else
              howLong = 'Just now';
      }

      return howLong;
  }
  
  this.confirmContactAction = function(conversationElement, question, yes, no, cb) {
    var dialog = $(conversationElement).find('.contact-action-confirm-dialog');
    dialog.show();
    setTimeout(function() {
      dialog.fadeOut(500);
    }, 5000);
    var yesElement = $(conversationElement).find('.contact-action-confirm-yes');
    var noElement = $(conversationElement).find('.contact-action-confirm-no');
    var questionElement = $(conversationElement).find('.contact-action-confirm-question');
    questionElement.text(question);
    yesElement.text(yes);
    noElement.text(no);
    yesElement.unbind('click');
    yesElement.click(function() {
      cb();
      dialog.fadeOut(200);
    });
    noElement.unbind('click');
    noElement.click(function() {
      dialog.fadeOut(200);
    });
  }
  
  this.setClickHandlers = function() {
    var contactText = $('.contact-text');
    contactText.unbind('click');
    var inputText = $('.contact-text-content');
    inputText.unbind('click');
    
    var clickHandler = function(event) {
      var conversationElement = $(event.target).parents('.conversation-template');
      var characterCountElement = conversationElement.find('.contact-text-character-count');

      var footer = conversationElement.find('.message-panel-footer');
      var hidden = conversationElement.find('.contact-text-container-hidden');
      var input = hidden.find('.contact-text-content');

      function sendText() {
        var contents = input.val();
        if (contents == "")
          return;
        var conversationId = conversationElement.find('#conversation-id').text();
        var conversation = desksms.conversations[conversationId];
        var number = conversation.number;
        desksms.sendSms(number, contents, function(err, data) {
          var errorText;
          if (err)
            errorText = 'Error communicating with the server.'
          else if (data.error)
            errorText = data.error;

          if (errorText) {
            $('#error-text').text(errorText);
            var pushErrorAlert = $('#error-alert');
            pushErrorAlert.show();
            pushErrorAlert.fadeOut(10000, function() {
              pushErrorAlert.hide();
            });
          }
          var date = data.data[0];
          var conversation = desksms.findConversation(number);
          var pendingMessage = {};
          pendingMessage.message = contents;
          pendingMessage.type = 'pending';
          pendingMessage.date = date;
          conversation.addMessage(pendingMessage);
          page.addMessageToConversation(pendingMessage);
        });
        
        input.val('');
      }
      
      var textButton = conversationElement.find('.contact-text')[0];
      if ($(hidden).is(":visible") && event.target == textButton) {
        var inputString = input.val();
        if (inputString != null && inputString.length > 0) {
          sendText();
          return;
        }
      }

      hidden.show();

      var recalcCharacterCount = function() {
        var inputString = input.val();
        var len = inputString.length;
        var pages = len / 160 + 1;
        var charactersLeft = 160 - (len % 160);
        var text = sprintf("%d characters remaining (%d)", charactersLeft, pages);
        characterCountElement.text(text);
      }

      recalcCharacterCount();

      setTimeout(function() {
        input.focus();
      }, 200);

      //input.val('');
      input.unbind('blur');
      input.unbind('keypress');
      // there seems to be a race condition between the element
      // disappearing and another text box getting focus
      input.blur(function(event) {
        setTimeout(function() {
          var inputString = input.val();
          if (!inputString || inputString.length == 0) {
            hidden.hide();
          }
        }, 200);
      });
      
      input.keypress(function(event) {
        var inputString = input.val();
        recalcCharacterCount();

        if (event.which != 13 || event.shiftKey)
          return;

        event.stopPropagation();
        event.preventDefault();
        
        sendText();
      });
    };
    
    contactText.click(clickHandler);
    inputText.click(clickHandler);
    
    var contactCall = $('.contact-call');
    contactCall.unbind('click');
    
    contactCall.click(function(event) {
      var conversationElement = $(event.target).parents('.conversation-template');
      var conversationId = $(conversationElement).find('#conversation-id').text();
      var conversation = desksms.conversations[conversationId];
      var number = conversation.number;
      var displayName = page.getDisplayName(conversation);
      
      page.confirmContactAction(conversationElement, sprintf("Call %s on your phone?", displayName), "yes", "no", function() {
        var contentStatus = $('#content-status');
        contentStatus.show();
        contentStatus.text(sprintf('Dialing %s on your phone...', displayName));
        $('html, body').animate({
            scrollTop: 0
        }, 500);
        desksms.dialNumber(number, function(err, data) {
          if (err || data.error) {
            contentStatus.text(sprintf('Error dialing %s...', displayName));
          }

          contentStatus.fadeOut(10000, function() {
            contentStatus.hide();
            contentStatus.text('');
          });
        });
      });
    });
    
    var contactDelete = $('.contact-delete');
    contactDelete.unbind('click');
    contactDelete.click(function(event) {
      var conversationElement = $(event.target).parents('.conversation-template');
      var conversationId = $(conversationElement).find('#conversation-id').text();
      var conversation = desksms.conversations[conversationId];
      var number = conversation.number;
      var displayName = page.getDisplayName(conversation);
      
      page.confirmContactAction(conversationElement, sprintf("Delete conversation with %s?", displayName), "yes", "no", function() {
        desksms.deleteConversation(conversation);
        conversationElement.remove();
      });
    });
  }

  this.getDisplayName = function(conversation) {
    var contact = conversation.contact;
      var displayName;
    if (!contact) {
      contact = page.getCachedContact(conversation);
    }
    if (contact) {
      displayName = contact.name; 
    }
    else if (conversation.name) {
      displayName = conversation.name;
    }
    else {
      displayName = conversation.number;
    }
    return displayName;
  }
  
  this.addMessageToConversation = function(message) {
    var conversation = message.conversation;
    var messageElement = $('#message-' + message.id);
    
    var needsInsert = false;
    if (messageElement == null || messageElement.length == 0) {
      needsInsert = true;
      var messageTemplate = $('#contact-message-template');

      messageElement = messageTemplate.clone();
      messageElement.attr('id', 'message-' + message.id);
      messageElement.removeClass("hidden");
    }
    
    var date = new Date(message.date);
    messageElement.removeClass("hidden");
    var from = $(messageElement).find(".message-from");
    var displayName = page.getDisplayName(conversation);
    if (message.type == 'incoming') {
      from.addClass('message-from-' + conversation.id);
      from.text(displayName);
    }
    else {
      from.text('Me');
    }
    if (message.type == 'pending') {
      $(messageElement).find('.message-pending').removeClass('hidden').attr('title', 'Text message delivery pending...');
      var expiredTime = new Date().getTime() - 5 * 60 * 1000;
      if (message.date < expiredTime) {
        $(messageElement).find('.message-pending').attr('src', 'images/message-failed.png').attr('title', 'Text message failed to send...');
      }
    }
    else {
      $(messageElement).find('.message-pending').addClass('hidden');
    }
    // check for 'undefined' because thats apparently what websql stores null as, sigh.
    if (message.image && message.image != 'undefined') {
      var img = $('<img></img>').attr('src', sprintf("%s/%s/%s", desksms.IMAGE_URL, encodeURIComponent(message.number), encodeURIComponent(message.date)));
      $(messageElement).find(".message-content").append(img);
    }
    else {
      $(messageElement).find(".message-content").text(message.message);
    }
    $(messageElement).find(".message-date").text(dateFormat(new Date(message.date), "shortTime"));
    
    if (needsInsert) {
        var messageContainer = $('#conversation-' + conversation.id).find('#contact-messages-internal');
        if (messageContainer == null || messageContainer.length == 0) {
          console.log('conversation not found.');
          return;
        }
      
      $(messageElement).insertBefore(messageContainer.find('#last-message'));
    }
  }
  
  this.addConversationToTop = function(conversation) {
    if (conversation == null)
      return;
    var conversationElement = $('#conversation-' + conversation.id);
    
    var conversationTemplate = $('#conversation-template');
    if (conversationElement == null || conversationElement.length == 0) {
      var contentContainer = $('#content-container');
      conversationElement = conversationTemplate.clone();
      conversationElement.attr('id', 'conversation-' + conversation.id);
      conversationElement.removeClass("hidden");
      //contentContainer.append(conversationElement);
      $(conversationElement).insertAfter(conversationTemplate);
    }
    else {
      conversationElement.detach();
      conversationElement.insertAfter(conversationTemplate);
    }
//    conversationElement.addClass("conversation");
    
    var messageTemplate = $('#contact-message-template');
    var messageContainer = $(conversationElement).find('#contact-messages-internal');
    var messageKeys = keys(conversation.messages);
    messageKeys.sort();
    messageKeys = messageKeys.slice(Math.max(0, messageKeys.length - 10), messageKeys.length);
    //var messages = conversation.messages.slice(Math.max(0, conversation.messages.length - 10), conversation.messages.length);
    var messages = [];
    $.each(messageKeys, function(index, value) {
      messages.push(conversation.messages[value]);
    });
    var lastMessage = messages[messages.length - 1];
    var lastMessageDate = '';
    if (lastMessage)
      lastMessageDate = page.longAgo(lastMessage.date);

    $(conversationElement).find('.contact-number').text(conversation.number);
    $(conversationElement).find('.contact-last-message-date').text(lastMessageDate);
    $(conversationElement).find('#conversation-id').text(conversation.id);
    
    var conversationReadStateElement = $(conversationElement).find('.conversation-read-state');
    conversationElement.unbind('click');
    conversationElement.click(function() {
      if (!conversation.read) {
        desksms.read();
        conversation.read = true;
      }
      conversationReadStateElement.animate({ 'border-color': "transparent" }, 'fast', function() {
        conversationReadStateElement.removeClass('conversation-unread');
        conversationReadStateElement.css('border-color', '')
      });
    });
    if (conversation.read)
      conversationReadStateElement.removeClass('conversation-unread');
    else
      conversationReadStateElement.addClass('conversation-unread');

    var contact = conversation.contact;
    var cachedContact = page.getCachedContact(conversation);
    var contactImage = $(conversationElement).find('.contact-image').attr('id', 'contact-image-' + conversation.id);
    var contactNameElement = $(conversationElement).find(".contact-name").attr('id', 'contact-name-' + conversation.id);
    if (contact) {
      console.log('fresh contact found for ' + conversation.number);
      // save to cache if necessary
      if (!contact.cached) {
        contact.cached = true;
        page.cacheContact(conversation, contact, contactImage);
      }
    }
    else {
      // try load from cache
      console.log('using cached contact for ' + conversation.number);
      conversation.contact = contact = cachedContact;
    }
    if (contact) {
      contactNameElement.text(contact.name);
      $(conversationElement).find('.contact-number').show();
    }
    else if (conversation.name) {
      contactNameElement.text(conversation.name);
      $(conversationElement).find('.contact-number').show();
    }
    else {
      contactNameElement.text(conversation.number);
      $(conversationElement).find('.contact-number').hide();
    }

    if (conversation.number == 'DeskSMS') {
      contactImage.attr('src', 'images/clockworkmod.png');
    }

    // if we have a contact available, try to find a valid photo url
    if (contact && contact.photo) {
      console.log('using fresh contact photo for ' + conversation.number);
      page.loadContactPhoto(contactImage, conversation, contact);
    }
    else if (cachedContact && cachedContact.photo) {
      console.log('using cached base64 contact photo for ' + conversation.number);
      page.loadContactPhoto(contactImage, conversation, cachedContact);
    }
    else if (conversation.name) {
      // try to fall back to a facebook photo by doing a name match
      var photoElement = contactImage;
      var facebookPhoto = facebookContacts.getPhotoForName(conversation.name);
      if (facebookPhoto) {
        photoElement.attr('src', facebookPhoto);
        photoElement.error(function() {
          console.log('facebook photo load failed for ' + conversation.number)
          photoElement.attr('src', 'images/desksms-small.png');
        });
      }
      else {
        console.log('no contact photo available for ' + conversation.number)
      }
    }
    else {
      console.log('no contact photo available for ' + conversation.number)
    }

    return conversationElement;
  }
  
  this.hasMarkedRead = false;
  this.hasSuccessfullySynced = false;
  this.refreshInbox = function(initialSync) {
    if (page.hasSuccessfullySynced && initialSync) {
      console.log("have already successfully synced. bailing.");
      return;
    }
    
    var startRefresh = desksms.lastRefresh;
    desksms.refreshInbox(function(err, messages) {
      if (err) {
        console.log(err);
        return;
      }
      if (messages == null) {
        console.log('no data returned from sms call');
        return;
      }
      if (messages.length == 0)
        return;
      page.hasSuccessfullySynced = true;

      if (!page.hasMarkedRead) {
        page.hasMarkedRead = true;
        desksms.read();
      }

      var conversations = {};
      $.each(messages, function(index, message) {
        conversations[message.conversation.id] = message.conversation;
      });

      conversations = sorty(keys(conversations), function(key) {
        return conversations[key].latestMessageDate;
      });

      $.each(conversations, function(index, conversation) {
        var convo = desksms.conversations[conversation];
        if (convo.number == 'DeskSMS')
          page.pongReceived = true;
        if (startRefresh == 0)
          convo.read = true;
        page.addConversationToTop(convo);
      });

      if (startRefresh == 0) {
        var contentStatus = $('#content-status');
        if (messages.length == 0) {
          contentStatus.show();
          contentStatus.text('You are successfully logged in, but no messages were found! Please verify the DeskSMS Android application is installed and syncing SMS on your phone.')
        }
        else {
          contentStatus.hide();
          contentStatus.text('')
        }
        var convoCounter = {};
        messages.reverse();

        messages = filter(messages, function(index, message) {
          if (!convoCounter[message.conversation.id])
            convoCounter[message.conversation.id] = 0;
          if (++convoCounter[message.conversation.id] >= 10)
            return null;
          return message;
        });
        messages.reverse();
      }
      else {
        $.each(messages, function(index, message) {
          if (message.type == 'incoming')
            notifications.showMessageNotification(message);
        });
      }

      $.each(messages, function(index, message) {
        page.addMessageToConversation(message);
      });

      page.setClickHandlers();
    });
  }
  
  var setupSearchBox = function() {
    var loginButton = $('#desksms-login');
    loginButton.attr('href', desksms.getLoginUrl());

    var input = $('#contact-search');
    input.focus();
    setTimeout(function() {
      input.focus();
    }, 200);
    input.keypress(function(event) {
      if (event.which != 13)
        return;
        var conversation = desksms.startConversation(input.val());
        var conversationElement = $('#conversation-' + conversation.id);
        if (!conversationElement || conversationElement.length == 0) {
          page.addConversationToTop(conversation);
          page.setClickHandlers();
        }
        conversationElement = $('#conversation-' + conversation.id);
        var contactText = $(conversationElement).find('.contact-text');
        contactText.trigger('click');
    });
    input.autocomplete({
      minLength: 0,
      source: function(req, res) {
        if (contacts.list && contacts.list.length > 0) {
          var matches = filter(contacts.list, function(index, contact) {
            var term = req.term.toLowerCase();
            if (contact.name.toLowerCase().indexOf(term) > -1 || contact.numbersOnly.indexOf(term) > -1) {
              var entry;
              if (contact.type)
                entry = sprintf("%s %s - %s", contact.name, contact.number, contact.type);
              else
                entry = sprintf("%s %s", contact.name, contact.number);
              var searchResult = {
                value: entry,
                label: entry,
                contact: contact
              };
              return searchResult;
            }
          });
          res(matches);
        }
      },
      select: function(event, ui) {
        var contact = ui.item.contact;
        setTimeout(function() {
          input.val(null);
        }, 200);

        var conversation = desksms.startConversation(contact.number);
        var conversationElement = $('#conversation-' + conversation.id);
        if (!conversationElement || conversationElement.length == 0) {
          page.addConversationToTop(conversation);
          page.setClickHandlers();
        }
        conversationElement = $('#conversation-' + conversation.id);
        var contactText = $(conversationElement).find('.contact-text');
        contactText.trigger('click');
      }
    });
  }
  
  var query = $.query.load(window.location.hash);
  var extension = query.get('extension');
  
  this.checkLogin = function() {
    desksms.whoami(function(err, data) {
      if (err || !data.email) {
        $('.login-hide').show();
        $('.login-show').hide();
        return;
      }

      // notify the chrome extension of login success
      $("#chrome-extension-data").text(desksms.email);

      var logoutButton = $('#desksms-logout');
      logoutButton.attr('href', desksms.getLogoutUrl());

      $('.login-hide').hide();
      $('.login-show').show();
      if (!data.registration_id) {
        $('#content-status-not-registered').show();
        return;
      }
      $('#content-status-not-registered').hide();

      page.refreshInbox(true);

      page.updateExpiration(data.subscription_expiration);

      var startPush = function() {
        if ($('#push-iframe')[0].contentWindow.startPush) {
          $('#push-iframe')[0].contentWindow.startPush(desksms.buyerId, function(err, data) {
            page.refreshInbox();
          });
        }
      }
      $('#push-iframe')[0].contentWindow.onPushReady = function() {
        startPush();
      }
      startPush();
    });
  }

  $(document).ready(function() {
    setupSearchBox();
    
    if (extension == 'firefox') {
      $('.firefox-extension-login').show();
    }

    // figure out who we are and if we're registered
    page.checkLogin();
    page.refreshInbox(true);
    
    if (extension) {
      $('.link').attr('target', '_blank');
      $('.github-fork').hide();
      var fullSite = window.location.href.substring(0, window.location.href.indexOf('#'));
      $('#desksms-header').attr('href', fullSite);
      $('.content-container').css('width', '95%');
    }
    $('.connect-google').attr('href', googleContacts.getAuthorizationUrl());
    $('.connect-facebook').attr('href', facebookContacts.getAuthorizationUrl());
    
    page.setClickHandlers();
  });

  var successfullyRetrievedContact = false;
  contacts.onNewContact(function(contact) {
    if (!successfullyRetrievedContact) {
      $('#connect-google').hide();
      successfullyRetrievedContact = true;
    }
    var conversation = desksms.findConversation(contact.number);
    if (conversation == null)
      return;

    // cache the contact
    var key = 'contact-image-' + conversation.id;
    var photoElement = $("#contact-image-" + conversation.id);
    page.cacheContact(conversation, contact, photoElement);
    
    if (contact.photo)
      page.loadContactPhoto(photoElement, conversation, contact);
    $("#contact-name-" + conversation.id).text(contact.name);
    $(".message-from-" + conversation.id).text(contact.name);
  });
  
  this.updateExpiration = function(subscription_expiration) {
    daysLeft = subscription_expiration - new Date().getTime();
    daysLeft = daysLeft / 24 / 60 / 60 / 1000;
    daysLeft = Math.round(daysLeft);
    $('#account-status').text(sprintf("%d days remaining", daysLeft));
    $('#account-status').show();
    if (daysLeft < 7 || page.sandbox) {
      daysLeft = Math.max(daysLeft, 0);
      $('#buy-desksms').text(sprintf("%d days left.", daysLeft));
      $('#buy-desksms').removeClass('hidden');
      $('#facebook-like').addClass('hidden');
    }
    else {
      // show the like button instead
      $('#buy-desksms').addClass('hidden');
      $('#facebook-like').removeClass('hidden');
    }
  }
  
  this.loadContactPhoto = function(photoElement, conversation, contact, skipFacebook) {
    // if we don't have local cache, or this contact is from cache
    // just use the explicit url
    if (!skipFacebook) {
      var facebookPhoto = facebookContacts.getPhotoForName(contact.name);
      if (facebookPhoto) {
        photoElement.attr('src', facebookPhoto);
        photoElement.error(function() {
          page.loadContactPhoto(photoElement, conversation, contact, true);
        });
        return;
      }
    }

    if (!window.localStorage || contact.fromCache) {
      photoElement.attr('src', contact.photo);
    }
    else {
      // if we are chrome, we can hook the image load to cache the contact image.
      // if not, we have to use the proxy.
      if (!page.isChrome()) {
        // use the proxy service to get a base64 encoded image in a jsonp payload
        jsonp(desksms.getCrossOriginImage(contact.photo), function(err, data) {
          if (err)
            return;
          var photo = 'data:image/png;base64,' + data.data;
          photoElement.attr('src', photo);
          var key = 'contact-' + conversation.id;
          var cachedContact = { name: contact.name, number: contact.number, numbersOnly: contact.numbersOnly, photo: photo };
          localStorage[key] = JSON.stringify(cachedContact);
        }, { alt: 'json'});
      }
      else {
        // do a cross origin request  on chrome.
        // chrome canvas and image can handle cross origin requests.
        photoElement[0].crossOrigin = '';
        photoElement.attr('src', desksms.getCrossOriginImage(contact.photo));
      }
    }
  }
  
  this.cachedContacts = {};
  this.getCachedContact = function(conversation) {
    var key = 'contact-' + conversation.id;
    var ret = this.cachedContacts[key];
    if (ret)
      return ret;
    try {
      ret = JSON.parse(localStorage[key]);
      // verify the cache still matches (in case the matching rules change, and the cache is old)
      if (!contacts.numbersMatch(ret.number, conversation.number))
        return null;
      ret.fromCache = true;
      this.cachedContacts[key] = ret;
      console.log('loading cached contact for ' + conversation.number);
      return ret;
    }
    catch(e) {
    }
    return null;
  }
  
  this.isChrome = function() {
    return navigator.userAgent.toLowerCase().indexOf('chrome') > -1;
  }
  
  this.cacheContact = function(conversation, contact, photoElement) {
    if (!window.HTMLCanvasElement || !window.localStorage)
      return;
    
    var key = 'contact-' + conversation.id;
    console.log('cached contact ' + conversation.number);
    var cachedContact = { name: contact.name, number: contact.number, numbersOnly: contact.numbersOnly };
    // preserve the existing contact photo if we need it.
    if (!cachedContact.photo) {
      var existingCachedContact = page.getCachedContact(conversation);
      if (existingCachedContact)
        cachedContact.photo = existingCachedContact.photo;
    }
    localStorage[key] = JSON.stringify(cachedContact);
    // and let's hook the handler on this contact photo in case something gets loaded into it
    photoElement.unbind('load');
    
    // if we are chrome, we can hook the image load to cache the contact image.
    // if not, we have to use the proxy.
    if (!page.isChrome())
      return;
    
    photoElement.load(function() {
      var canvas = document.createElement('canvas');
      canvas.setAttribute('width', photoElement.width());
      canvas.setAttribute('height', photoElement.height());
      var ctx = canvas.getContext('2d');
      ctx.drawImage(this, 0, 0);
      var data = canvas.toDataURL();
      cachedContact.photo = data;
      localStorage[key] = JSON.stringify(cachedContact);
      console.log('cached contact photo ' + conversation.number);
    });
  }

  this.sandbox = false;
  if (this.sandbox) {
    google.load('payments', '1.0', {
      'packages': ['sandbox_config']
    });
  }
  else {
    google.load('payments', '1.0', {
      'packages': ['production_config']
    });
  }
  
  this.purchaseOnMarket = function() {
    $('#buy-android').fadeIn(500);
  }
  
  this.purchaseOnPayPal = function() {
    $('#buy-paypal').fadeIn(500);
  }
  
  this.purchaseOnGoogleCheckout = function() {
    $('#buy-dialog').hide();
    var customPayload = { account: desksms.email };

    jsonp(sprintf('https://clockworkbilling.appspot.com/api/v1/order/koushd@gmail.com/desksms.subscription0?custom_payload=%s&buyer_id=%s&sandbox=%s&buyer_email=%s', encodeURIComponent(JSON.stringify(customPayload)), desksms.buyerId, page.sandbox, desksms.email),
      function(err, data) {
        if (err)
          return;
        if (data.purchased) {
          alert("You've already purchased this!");
          return;
        }
        goog.payments.inapp.buy({
            'jwt': data.jwt,
            'success': function() {
              $('#buy-desksms-container').hide();
              // this is hidden, but we call this to force a server refresh of the subscription time.
              page.updateStatus();
            },
            'failure': function() {}
            });
      });
  }
  
  this.updateStatus = function() {
    desksms.status(function(err, data) {
      if (err)
        return;
      page.updateExpiration(data.subscription_expiration);
    });
  }

  this.purchase = function() {
    $('#account-status').hide()
    $('#buy-checkout-complete').hide();
    $('#buy-android').hide();
    $('#buy-paypal').hide();
    $('#buy-dialog').show();
    $(':focus').blur();
    page.updateStatus();
  }

  this.pongReceived = false;
  this.pong = function() {
    this.pongReceived = false;
    desksms.pong(function(err, data) {
      var errorText;
      if (err)
        errorText = 'Error communicating with the server.'
      else if (data.error)
        errorText = data.error;

      if (errorText) {
        $('#error-text').text(data.error);
        var pushErrorAlert = $('#error-alert');
        pushErrorAlert.show();
        pushErrorAlert.fadeOut(10000, function() {
          pushErrorAlert.hide();
        });
        page.pongReceived = true;
        return;
      }
    });
    var contentStatus = $('#content-status');
    contentStatus.show();
    contentStatus.text('Checking connection to phone...');
    contentStatus.fadeOut(15000, function() {
      contentStatus.hide();
      contentStatus.text('');
    });
    $('#options-dialog').dialog('close');
    setTimeout(function() {
      if (page.pongReceived)
        return;
      $('#error-text').text('The push connection to the phone has failed!');
      var pushErrorAlert = $('#error-alert');
      pushErrorAlert.show();
      pushErrorAlert.fadeOut(10000, function() {
        pushErrorAlert.hide();
      });
    }, 15000);
  }
  
  this.closeDialog = function(e) {
    $(e).parents('.dialog-container').hide();
  }
  
  var settings = { forward_xmpp: true, forward_web: true, forward_email: true, tickle: true };
  this.showDeliveryOptions = function() {
    $('#delivery-options-dialog').show();
    $('.setting').addClass('primary').removeClass('secondary');
    desksms.getSettings(function(err, data) {
      if (err)
        return;
      $.each(data, function(key, value) {
        settings[key] = value;
        if (!value)
          $('#setting-' + key).removeClass('primary').addClass('secondary');
      });
      // push these settings to the phone to force the sync
      desksms.updateSettings(settings, function(err, data) {
        console.log(data);
      });
    });
  }

  this.updateDeliveryOptions = function(element) {
    desksms.updateSettings(settings, function(err, data) {
      console.log(data);
    });
    page.closeDialog(element);
  }

  this.showNotificationSettings = function() {
    var sound = localStorage['play-sound'];
    if (!sound)
      sound = 'None';
    if (navigator.userAgent.indexOf('Chrome') != -1 || navigator.userAgent.indexOf('Firefox') != -1) {
      $('.notification-type-ogg').show();
      $('.notification-type-mp3').hide();
    }
    else {
      $('.notification-type-ogg').hide();
      $('.notification-type-mp3').show();
    }
    $('#notification-button-' + sound).removeClass('secondary').addClass('primary');
    $('#notification-settings').show();
  }
  
  this.setNotification = function(element) {
    element = $(element);
    var sound = element.attr('id');
    sound = sound.substring("notification-button-".length);
    localStorage['play-sound'] = sound;
    if (sound != 'None') {
      $('#notification-' + sound)[0].volume = .3;
      $('#notification-' + sound)[0].play();
    }
    $('.notification').removeClass('primary').addClass('secondary');
    element.removeClass('secondary').addClass('primary');
  }

  this.toggleSetting = function(element) {
    element = $(element);
    var id = element.attr('id');
    id = id.substring(id.indexOf('-') + 1);
    settings[id] = !settings[id];
    if (settings[id])
      $('#setting-' + id).removeClass('secondary').addClass('primary');
    else
      $('#setting-' + id).removeClass('primary').addClass('secondary');
  }
  
  this.showReferralDialog = function() {
    $('#referral-message').val('');
    $('#referral-email').val('');
    $('#referral-dialog').show();
  }
  
  this.sendReferral = function(element) {
    this.closeDialog(element);
    var message = $('#referral-message').val();
    var referral = $('#referral-email').val();
    desksms.referral(referral, message, function(err, data) {
      var errorText = null;
      if (err)
        errorText = 'Unknown error.';
      if (data && !data.success)
        errorText = data.error;
      if (errorText) {
        $('#error-text').text(errorText);
        var errorAlert = $('#error-alert');
        errorAlert.show();
        errorAlert.fadeOut(10000, function() {
          errorAlert.hide();
        });
      }
      else {
        var contentStatus = $('#content-status');
        contentStatus.show();
        contentStatus.text('Your email recommending DeskSMS has been sent!');
        contentStatus.fadeOut(15000, function() {
          contentStatus.hide();
          contentStatus.text('');
        });
      }
    })
  }
  
  this.showThemes = function() {
    var theme = localStorage.theme;
    if (!theme)
      theme = 'default';
    $('.theme').removeClass('primary').addClass('secondary');
    $('#theme-' + theme).removeClass('secondary').addClass('primary');

    $('#themes-dialog').show();
  }
  
  this.switchTheme = function(element) {
    element = $(element);
    var id = element.attr('id');
    id = id.substring(id.indexOf('-') + 1);
    if (!id || id == 'default') {
      delete localStorage.theme;
    }
    else {
      localStorage.theme = id;
    }
    window.location.reload();
  }
  
  this.forceSync = function() {
    desksms.tickle('outbox');
  }

  this.clearSyncedData = function() {
    facebookContacts.clearData();
    googleContacts.clearData();
    for (var key in localStorage) {
      if (key.indexOf('contact-') == 0) {
        delete localStorage[key];
      }
    }
    desksms.clearData();
    window.location.reload();
  }
}
