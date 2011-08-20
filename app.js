
/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var app = module.exports = express.createServer();
var path = require('path');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

var renderPage = function(req, res, page, templateArgs) {
  
  if (!templateArgs) {
    templateArgs = {};
  }
  
  templateArgs.page = page;
  
  res.render(page, templateArgs);
}

// Routes

app.get('/', function(req, res){
  var notificationFiles = fs.readdirSync(__dirname + '/public/notifications');
  var notifications = []
  for (var i in notificationFiles) {
    var n = notificationFiles[i];
    n = n.substring(0, n.indexOf('.'));
    notifications.push(n);
  }

  renderPage(req, res, 'index', { notifications: notifications});
});

var listenPort = process.env.PORT == null ? 3000 : parseInt(process.env.PORT);
app.listen(listenPort);
console.log('Express app started on port ' + listenPort);
