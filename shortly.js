var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');


var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');


var app = express();

app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));
app.use(session({secret: 'keyboard cat', cookie: { maxAge: 60000 }}));

//-----------------------------------------------------------------------------------

var passport = require('passport')
  , utils = require('util')
  , GitHubStrategy = require('passport-github2').Strategy;


app.use(passport.initialize());
app.use(passport.session());



var GITHUB_CLIENT_ID = "872328ce869e9ecfeb7d"
var GITHUB_CLIENT_SECRET = "b40e719b67c9a7420474662d3664aa6127be102b";

//---------------------------------------------------------------------------------
passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});


passport.use(new GitHubStrategy({
    clientID: GITHUB_CLIENT_ID,
    clientSecret: GITHUB_CLIENT_SECRET,
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {
    process.nextTick(function () {

      return done(null, profile);
    });
  }
));


app.get('/', ensureAuthenticated, function(req, res){
  res.render('index', { user: req.user });
});

app.get('/create', ensureAuthenticated,
  function(req, res) {
    res.render('index');
  }
);


app.get('/links', ensureAuthenticated,
  function(req, res) {
    Links.reset().fetch().then(function(links) {
      res.send(200, links.models);
    });
  }
);

app.get('/account', ensureAuthenticated, function(req, res){
  res.render('account', { user: req.user });
});

app.post('/links', ensureAuthenticated,
  function(req, res) {
    var uri = req.body.url;

    if (!util.isValidUrl(uri)) {
      console.log('Not a valid url: ', uri);
      return res.send(404);
    }

    new Link({ url: uri }).fetch().then(function(found) {
      if (found) {
        res.send(200, found.attributes);
      } else {
        util.getUrlTitle(uri, function(err, title) {
          if (err) {
            console.log('Error reading URL heading: ', err);
            return res.send(404);
          }

          var link = new Link({
            url: uri,
            title: title,
            base_url: req.headers.origin
          });

          link.save().then(function(newLink) {
            Links.add(newLink);
            res.send(200, newLink);
          });
        });
      }
    });
  }
);

/************************************************************/
// Write your authentication routes here
/************************************************************/

app.get('/login', function(req, res){
  res.render('login', { user: req.user });
});

app.get('/auth/github',
  passport.authenticate('github', { scope: [ 'user:email' ] }),
  function(req, res){

  });

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });

app.get('/logout', function(req, res){
  req.logout();
  res.redirect('/');
});

app.listen(3000);

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  res.redirect('/login')
}

//-------------------------------------------------------------------------------------
// app.get('/signup', function(req, res) {
//   res.render('signup');
// });

// app.get('/login', function(req, res) {
//   res.render('login');
// });

// app.get('/logout', function(req, res) {
//   req.session.destroy(function() {
//     res.redirect('login');
//   })
// })

// app.post('/signup', function(req, res) {
//   var username = req.body.username;
//   var password = req.body.password;

//   new User ({username: username}).fetch().then(function(found) {
//     if(found) {
//       // alert('Username already exists!');
//       res.redirect('signup');
//     } else {
//       var user = new User({
//         username: username,
//         password: password
//       });

//       user.save().then(function(newUser) {
//         Users.add(newUser);
//         req.session.regenerate(function() {
//           req.session.user = newUser.username;
//           res.redirect('/');
//         });
//       });
//     }
//   });
// });


// app.post('/login', function(req, res) {
//   var username = req.body.username;
//   var password = req.body.password;

//   new User({username: username}).fetch().then(function(found) {
//     if(!found) {
//       res.redirect('/login');
//     } else {
//       found.check(password, found.attributes.password,
//         function() {
//           req.session.regenerate(function() {
//             req.session.user = username;
//             res.redirect('/');
//           });
//         },
//         function() {
//           res.redirect('login');
//         }
//       )
//     }
//   });
// });


/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);

