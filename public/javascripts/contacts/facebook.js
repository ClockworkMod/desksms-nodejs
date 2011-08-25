var facebookContacts = new function() {
  function levenshtein(str1, str2) {
      var l1 = str1.length, l2 = str2.length;
      if (Math.min(l1, l2) === 0) {
          return Math.max(l1, l2);
      }
      var i = 0, j = 0, d = [];
      for (i = 0 ; i <= l1 ; i++) {
          d[i] = [];
          d[i][0] = i;
      }
      for (j = 0 ; j <= l2 ; j++) {
          d[0][j] = j;
      }
      for (i = 1 ; i <= l1 ; i++) {
          for (j = 1 ; j <= l2 ; j++) {
              d[i][j] = Math.min(
                  d[i - 1][j] + 1,
                  d[i][j - 1] + 1, 
                  d[i - 1][j - 1] + (str1.charAt(i - 1) === str2.charAt(j - 1) ? 0 : 1)
              );
          }
      }
      return d[l1][l2];
  }
  
  this.getAuthorizationUrl = function() {
    var clientId = window.location.host == 'desksms.appspot.com' ? '166240436784956' : '211883155532719';
    var url = 'https://www.facebook.com/dialog/oauth?client_id=%s&redirect_uri=%s&response_type=token';
    url = sprintf(url, clientId, encodeURIComponent(window.location.protocol + '//' + window.location.host + window.location.pathname + "#token_type=facebook"));
    return url;
  }
  
  this.getPhotoForName = function(contactName) {
    if (!facebookContacts.facebookData)
      return;
    var best = null;
    var bestDistance = 10000;
    $.each(facebookContacts.facebookData.data, function(key, fbContact) {
      var distance = levenshtein(contactName, fbContact.name);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = fbContact;
      }
    });
    
    if (bestDistance < 4) {
      return sprintf('https://graph.facebook.com/%s/picture?type=normal', best.id);
    }

    return null;
  }
  
  var facebookData = null;

  contacts.addProvider("facebook", facebookContacts);
  $(document).ready(function() {
    var query = $.query.load(window.location.hash);
    var access_token = query.get('access_token');
    if (access_token && query.get('token_type') == 'facebook') {
      localStorage['facebook.access_token'] = access_token;
      window.location.hash = '';

      jsonp(sprintf('https://graph.facebook.com/me/friends?fields=id,name,picture&access_token=%s', access_token), function(err, data) {
        if (err)
          return;
        facebookContacts.facebookData = data;
        localStorage['facebook.facebook_data'] = JSON.stringify(data);
        window.location.reload();
      });
    }
    else {
      var data = localStorage['facebook.facebook_data'];
      if (data)
        facebookContacts.facebookData = JSON.parse(data);
    }
  });
}
