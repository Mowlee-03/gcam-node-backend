var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var cors = require("cors")
var indexRouter = require('./src/routes/index');
var apiRouter = require('./src/routes/apiRoute');
var publicRouter = require("./src/routes/publicRoute");
const authMiddleware = require('./src/middleware/authMiddleware');


var app = express();

// view engine setup
app.set('views', path.join(__dirname,'src', 'views'));
app.set('view engine', 'pug');

app.use(cors({
  origin:["http://192.168.31.21:5173","http://192.168.31.23:5173"],
  credentials:true
}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use("/gcam/common",publicRouter)
app.use('/api', authMiddleware,apiRouter);
app.use("/images", express.static(path.join(__dirname, "public/images")));
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
