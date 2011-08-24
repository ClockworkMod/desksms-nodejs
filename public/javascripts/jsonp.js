var jsonp = function(url, cb, data) {
  var type = "jsonp";

  if (url.indexOf("https://desksms.appspot.com") == 0 || url.indexOf("http://desksms.appspot.com") == 0)
    type = "json";

  if (url.indexOf("https://2.desksms.appspot.com") == 0 || url.indexOf("http://2.desksms.appspot.com") == 0)
    type = "json";

  var jqXHR = $.get(url, data, function(data) {
    if (cb)
      cb(null, data);
  },
  type).error(function(err) {
    if (cb)
      cb(err);
  }).complete(function(jqXHR) {
  });
  return jqXHR;
}
