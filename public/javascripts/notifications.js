var notifications = new function() {
  var query = null;
  var extension = null;

  this.showNotification = function(icon, title, message) {
    try {
      // play the sound notification
      var sound = localStorage['play-sound'];
      if (!sound)
        sound = 'None';
      if (sound != 'None') {
        $('#notification-' + sound)[0].volume = .3;
        // don't play if the extension exists, the extension will play it
        if ($("#has-chrome-extension").length === 0)
          $('#notification-' + sound)[0].play();
      }
    }
    catch (e) {
      console.log(e);
    }

    if (window.webkitNotifications && localStorage['chrome-notifications']) {
      console.log(webkitNotifications.checkPermission());
      if (webkitNotifications.checkPermission() != 0)
        return;
      // don't show toast if the extension exists, the extension will show it
      if ($("#has-chrome-extension").length > 0)
        return;
      var notification = webkitNotifications.createNotification(icon, title, message);
      notification.show();
      setTimeout(function() {
        notification.cancel();
      }, 10000);
    }
    else if (extension == 'firefox') {
      // firefox only shows badges
      var curCount = 0;
      var firefoxExtensionData = $('#firefox-extension-data');
      curCount = parseInt(firefoxExtensionData.text());
      if (isNaN(curCount))
        curCount = 0;
      curCount++;
      
      firefoxExtensionData.text(curCount);
    }
  }
  
  this.showMessageNotification = function(message) {
    var icon = 'images/desksms-small.png';
    var displayName = message.number;
    var contact = message.conversation.contact;
    if (contact) {
      displayName = contact.name;
      if (contact.photo)
        icon = contact.photo;
    }
    
    var title = sprintf("SMS Received: %s", displayName);
    this.showNotification(icon, title, message.message);
  }

  $(document).ready(function() {
    query = $.query.load(window.location.hash);
    extension = query.get('extension');

    if (!window.webkitNotifications) {
      $('#enable-chrome-notifications').remove();
      return;
    }
    
    if (webkitNotifications.checkPermission() == 0 && localStorage['chrome-notifications']) {
      $('#enable-chrome-notifications-link').text('Disable Chrome Notifications')
    }
    else {
      $('#enable-chrome-notifications-link').text('Enable Chrome Notifications')
    }
  });
  
  this.toggleChromeNotifications = function() {
    if (webkitNotifications.checkPermission() == 0) {
      if (localStorage['chrome-notifications']) {
        delete localStorage['chrome-notifications'];
        $('#enable-chrome-notifications-link').text('Enable Chrome Notifications')
      }
      else {
        localStorage['chrome-notifications'] = true;
        $('#enable-chrome-notifications-link').text('Disable Chrome Notifications')
      }
    }
    else {
      webkitNotifications.requestPermission(function() {
        localStorage['chrome-notifications'] = true;
        $('#enable-chrome-notifications-link').text('Disable Chrome Notifications')
      });
    }
  }
}