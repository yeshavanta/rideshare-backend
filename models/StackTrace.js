/**
 * Created by ykp on 8/18/15.
 */

var db = require('../db.js');

var stackTrace = db.model('StackTrace',{
    stackTrace:Object
})

module.exports = stackTrace;