var db = require('../config');
var bcrypt = require('bcrypt-nodejs');
var Promise = require('bluebird');

var User = db.Model.extend({
  tableName:'users',
  hasTimestamps: true,
  initialize: function() {
    this.on('creating', function(model) {
      var password = model.get('password');
      var salt = bcrypt.genSaltSync(10);
      var hash = bcrypt.hashSync(password, salt);
      model.set('password', hash);
    });
  },
  check: function(newPwd, oldPwd, successCb, failCb) {
    bcrypt.compare(newPwd, oldPwd, function(err, same) {
      if (same) {
        successCb();
      } else {
        failCb();
      }
    });
  }
});




module.exports = User;
