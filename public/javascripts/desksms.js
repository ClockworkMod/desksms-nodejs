function Conversation(number) {
  this.number = number;
  this.numbersOnly = contacts.numbersOnly(number);
  this.id = Crypto.MD5(this.number);
  this.messages = {};
  this.latestMessageDate = 0;
  this.contact = contacts.findNumber(number);
  this.read = false;
}

Conversation.prototype.addMessage = function(message) {
  message.id = this.numbersOnly + '-' + message.date;
  message.conversation = this;
  this.latestMessageDate = Math.max(this.latestMessageDate, message.date);
  this.messages[message.id] = message;
}

var desksms = new function() {
  this.BASE_URL = "https://desksms.appspot.com";
  this.API_URL = this.BASE_URL + "/api/v1";
  {
    var email = localStorage['desksms.email'];
    if (!email)
      email = 'default';
    this.USER_URL = this.API_URL + '/user/' + email;
  }
  this.SETTINGS_URL = this.USER_URL + "/settings";
  this.SMS_URL = this.USER_URL + "/getsms";
  this.CALL_URL = this.USER_URL + "/call";
  this.DIAL_URL = this.USER_URL + "/dial";
  this.OUTBOX_URL = this.USER_URL + "/outbox";
  this.LOGIN_URL = this.API_URL + "/login?continue=%s";
  this.LOGOUT_URL = this.API_URL + "/logout?continue=%s";
  this.WHOAMI_URL = this.USER_URL + "/whoami";
  this.PROXY_URL = this.API_URL + "/proxy?proxied=%s";
  this.BADGE_URL = this.USER_URL + "/badge";
  this.READ_URL = this.USER_URL + "/read";
  this.STATUS_URL = this.USER_URL + "/status";
  this.IMAGE_URL = this.USER_URL + "/image";
  this.PONG_URL = this.USER_URL + "/pong";
  this.DELETE_CONVERSATION_URL = this.USER_URL + "/delete/conversation";
  this.TICKLE_URL = this.USER_URL + "/tickle";
  this.REFERRAL_URL = this.USER_URL + "/referral";

  this.conversations = {};
  
  this.tickle = function(type, cb) {
    jsonp(this.TICKLE_URL, cb, { type: type });
  }

  this.getSettings = function(cb) {
    jsonp(this.SETTINGS_URL, cb);
  }

  this.updateSettings = function(settings, cb) {
    jsonp(this.SETTINGS_URL, cb, settings);
  }

  this.getCrossOriginImage = function(image) {
    return sprintf(this.PROXY_URL, encodeURIComponent(image))
  }

  this.getLoginUrl = function() {
    return sprintf(this.LOGIN_URL, encodeURIComponent(window.location.href));
  }

  this.getLogoutUrl = function() {
    return sprintf(this.LOGOUT_URL, encodeURIComponent(window.location.href));
  }

  this.registrationId = null;
  this.email = null;
  this.buyerId = null;
  this.whoami = function(cb) {
    jsonp(this.WHOAMI_URL, function(err, data) {
      if (data) {
        desksms.email = data.email;
        desksms.registrationId = data.registration_id;
        desksms.buyerId = data.buyer_id;
        localStorage['desksms.last_email'] = desksms.email;
        console.log(desksms.buyerId);
      }
      cb(err, data);
    });
  }

  this.pong = function(cb) {
    jsonp(this.PONG_URL, cb);
  }

  this.startConversation = function(number) {
    var convo = this.findConversation(number);
    if (convo)
      return convo;
    convo = new Conversation(number);
    this.conversations[convo.id] = convo;
    return convo;
  }

  this.findConversation = function(number) {
    return contacts.findNumber(number, desksms.conversations);
  }
  
  /*
    options = {
      max_date: null,
      min_date: null,
      number: null
    }
  */
  this.parseSms = function(data) {
    if (data) {
      localStorage['desksms.last_email'] = data.email;
      if (data.data.length == 0)
        return;
      // bucket these into conversations
      var db = desksms.db;
      if (db) {
        db.transaction(function(t) {
          $.each(data.data, function(index, message) {
            t.executeSql('insert or replace into message (date, number, name, key, message, type, email) values (?, ?, ?, ?, ?, ?, ?, ?)', [message.date, message.number, message.name, message.key, message.message, message.type, data.email, message.image]);
          });
        }, function(err) {
          console.log(err);
        }, function(err) {
          console.log(err);
        });
      }
      $.each(data.data, function(index, message) {
        var conversation = desksms.startConversation(message.number);
        if (message.type == 'incoming')
          conversation.read = false;
        if (message.name)
          conversation.name = message.name;
        conversation.addMessage(message);
      });
    }
  }

  this.read = function(cb) {
    jsonp(this.READ_URL, cb);
  }

  this.status = function(cb) {
    jsonp(this.STATUS_URL, cb);
  }

  this.getSms = function(options, cb) {
    jsonp(this.SMS_URL, function(err, data) {
      desksms.parseSms(data);
      cb(err, data);
    }, options);
  }
  
  this.prepareDatabase = function() {
    desksms.db = window.openDatabase("desksms", null, "DeskSMS Database", 1024 * 1024 * 10);
    var db = desksms.db;
    var version = localStorage['desksms.db.version'];
    var res = db.transaction(function(t) {
      if (version == null) {
        t.executeSql('create table if not exists message (date integer primary key not null, number text not null, name text, key text not null, message text, type text)');
        version = 1;
      }
      if (version == 1) {
        t.executeSql('drop table message');
        t.executeSql('create table if not exists message (date integer not null, number text not null, name text, key text primary key not null, message text, type text, email text not null)');
        version = 2;
      }
      if (version == 2) {
        t.executeSql('alter table message add column image text');
        version = 3;
      }
    }, null, function() {
      localStorage['desksms.db.version'] = version;
    });
    console.log(res);
  }

  this.lastRefresh = 0;
  this.refreshInProgress = false;
  this.db = null;
  this.refreshInbox = function(cb) {
    if (this.refreshInProgress) {
      console.log("sync in progress");
      return;
    }
  
    this.refreshInProgress = true;

    var lastRefresh = this.lastRefresh;
    var startRefresh = this.lastRefresh;
    if (lastRefresh == 0)
      lastRefresh = new Date().getTime() - 3 * 24 * 60 * 60 * 1000;

    var lastEmail = localStorage['desksms.last_email'];
    var existingMessages = null;
    var refresher = function() {
      console.log(lastRefresh);
      desksms.getSms({ after_date: lastRefresh }, function(err, data) {
        desksms.refreshInProgress = false;
        var messages;
        if (existingMessages && existingMessages.length > 0) {
          if (lastEmail != data.email) {
            console.log('user change detected, refreshing...');
            desksms.refreshInbox(cb);
            return;
          }
          messages = existingMessages;
        }
        else {
          messages = [];
        }
        if (data && data.data)
            messages = messages.concat(data.data);
        $.each(messages, function(index, message) {
          if (message.type == 'incoming' || message.type == 'outgoing')
            lastRefresh = Math.max(message.date, lastRefresh);
        });
        desksms.lastRefresh = lastRefresh;

        // sort it in case the server sent some stuff from the past?
        // that would mess up the merge.
        messages = sorty(messages, function(message) {
          return message.date;
        });

        if (cb) {
          cb(err, messages);
        }
      });
    }

    if (startRefresh == 0 && window.openDatabase && lastEmail) {
      // this is initial population, let's see if we can grab it from the local database first.
      if (!desksms.db) {
        desksms.prepareDatabase();
      }
      var db = desksms.db;
      db.readTransaction(function(t) {
        t.executeSql('select * from message where date > ? and email = ? order by date asc', [lastRefresh, lastEmail], function(t, results) {
          if (results && results.rows) {
            existingMessages = [];
            for (var i = 0; i < results.rows.length; i++) {
              var message = results.rows.item(i);
              var conversation = desksms.startConversation(message.number);
              if (message.name)
                conversation.name = message.name;
              conversation.addMessage(message);
              existingMessages.push(message)
            }
            console.log('found ' + existingMessages.length + ' cached messages');
          }
        });
      }, function(t, err) {
        console.log(err);
        refresher();
      }, function() {
        refresher();
      });
    }
    else {
      console.log('full refresh');
      refresher();
    }
  }
  
  this.push = function(cb) {
    var scheduleNextPushConnection = function() {
      setTimeout(function() {
        // try setting up a push connection again in 30 seconds
        desksms.push(cb);
      }, 30000);
    }

    if (!desksms.buyerId) {
      cb({ error: 'no id', unregistered: true });
      scheduleNextPushConnection();
      return;
    }

    $.get('http://desksmspush.deployfu.com:9980/wait/' + encodeURIComponent(desksms.buyerId) + "?nonce=" + new Date().getTime(), function(data) {
      desksms.push(cb);
      cb(null, data);
    })
    .error(function(err) {
      scheduleNextPushConnection();
      cb(err);
    });
  }

  this.getOutbox = function(options, cb) {
    jsonp(this.OUTBOX_URL, cb, options);
  }
  
  this.sendSms = function(number, message, cb) {
    var envelope = { data: [{ number: number, message: message }] };
    var stringData = JSON.stringify(envelope);
    console.log(stringData);
    var args = { operation: "POST", data: stringData };
    jsonp(this.OUTBOX_URL, cb, args);
  }
  
  if (window.contacts) {
    contacts.onNewContact(function(contact) {
      var conversation = desksms.findConversation(contact.number);
      if (conversation == null)
        return;

      conversation.contact = contact;
    });
  }

  this.dialNumber = function(number, cb) {
    jsonp(this.DIAL_URL, cb, { number: number });
  }
  
  this.deleteConversation = function(conversation) {
    if (conversation == null)
      return;
    var numbers = {};
    $.each(conversation.messages, function(index, message) {
      number = numbers[message.number];
      if (!number)
        number = numbers[message.number] = []
      number.push(message.date);
    });
    
    if (desksms.db) {
      var db = desksms.db;
      db.transaction(function(t) {
        $.each(conversation.messages, function(index, message) {
          t.executeSql('delete from message where date = ?', [message.date]);
        });
      });
    }

    $.each(numbers, function(number, dates) {
      // delete 10 at a time
      while (dates.length > 0) {
        var range = dates.splice(0, 10);
        jsonp(desksms.DELETE_CONVERSATION_URL, null, { number: number, dates: JSON.stringify(range) });
      }
    });
  }

  this.lastBadgeDate = null;
  this.badge = function(cb) {
    var data;
    if (desksms.lastBadgeDate) {
      data = { after_date: desksms.lastBadgeDate };
    }
    jsonp(desksms.BADGE_URL, function(err, data) {
      if (!err && (data.badge || !desksms.lastBadgeDate)) {
        desksms.lastBadgeDate = data.date;
      }
      cb(err, data);
    }, data);
  }

  this.clearData = function() {
    delete localStorage['desksms.last_email'];
    if (desksms.db) {
      desksms.db.transaction(function(t) {
        t.executeSql('delete from message');
      });
    }
  }
  
  this.referral = function(referral, message, cb) {
    jsonp(this.REFERRAL_URL, cb, { referral: referral, message: message });
  }
};
