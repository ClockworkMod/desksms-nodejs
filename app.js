
/**
 * Module dependencies.
 */

var express = require('express');
var fs = require('fs');
var app = module.exports = express.createServer();
var path = require('path');
var url = require('url');

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  var staticHandler = express.static(__dirname + '/public');

  app.use(function(req, res, next) {
    if (req.url.indexOf('/notifications/') == 0)
      res.header('Cache-Control', 'max-age=1209600')
    else
      res.header('Cache-Control', 'max-age=600')
    staticHandler(req, res, next);
  });
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
  res.header('Cache-Control', 'max-age=600')
  var notificationFiles = fs.readdirSync(__dirname + '/public/notifications');
  var stripExtension = function(filename) {
    return filename.substring(0, filename.indexOf('.'));
  }
  var oggs = [];
  var wavs = [];
  for (var i in notificationFiles) {
    var n = notificationFiles[i];
    var ext = path.extname(n);
    if (ext == '.ogg')
      oggs.push(n);
    else
      wavs.push(n);
  }

  renderPage(req, res, 'index', { oggs: oggs, wavs: wavs, stripExtension: stripExtension, extname: path.extname});
});

var listenPort = process.env.PORT == null ? 3000 : parseInt(process.env.PORT);
app.listen(listenPort);
console.log('Express app started on port ' + listenPort);
