var express = require('express');
var webpackDevMiddleware = require("webpack-dev-middleware");
var webpack = require("webpack");
var config = require("./webpack.config.js");
var path = require('path');
var fs = require('fs');

var port = 3005;

var app = express();
app.use(webpackDevMiddleware(webpack(config), {}));

app.get('/all', function(request, response) {
  response.header('Content-Type: text/json');
  console.log('/all');
  // fs.readFile('all.json', function(err, data) {
  fs.readFile('offis-simulink-all-no-genid.jsonld', function(err, data) {
    console.log(err,data);
    if (!err) {
      response.send(String(data));
    }
  });
});

app.use('/', express.static(path.resolve('./app')));
app.listen(port, function() {
  console.log('listening at localhost:' + port);
});
