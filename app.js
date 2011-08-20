
/**
 * Module dependencies.
 */

var express = require('express');

var app = module.exports = express.createServer();

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

var renderPage = function(req, res, page) {
  res.render(page, {
    page: page
  });
}

// Routes

app.get('/', function(req, res){
  renderPage(req, res, 'index');
});

app.listen(3000);
console.log("Express server listening on port %d", app.address().port);
