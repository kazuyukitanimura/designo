
/**
 * Module dependencies.
 */

var express = require('express'),
    RedisStore = require('connect-redis')(express),
    Twitter = require('./twitter');

var app = module.exports = express.createServer();
var sessionStore = new RedisStore;

var consumerKey = 'your consumer key',
    consumerSecret = 'your consumer secret';

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.cookieParser());
  app.use(express.session({secret: 'himitsu!', fingerprint: function(req){return req.socket.remoteAddress;}, store: sessionStore, key: 'express.sid'}));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express['static'](__dirname + '/public'));
  app.use(express.logger({ format: ':method :url' }));
});

app.configure('development', function(){
  express.logger('development node');
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  express.logger('production node');
  app.use(express.errorHandler()); 
});

// Routes

app.get('/', function(req, res){
  var jadeFile = 'login.jade',
      loginMessage = 'Login with Twitter!',
      loginTo = '/login',
      screenName = 'Twitter ID';
  if(req.session.oauth){
    jadeFile = 'index.jade';
    loginMessage = 'Logout';
    loginTo = '/logout';
    try{
      screenName = req.session.oauth._results.screen_name;
    }catch(e){
      console.error('screen_name ERROR: ' + e);
      setTimeout(res.redirect, 500, '/');
    }
  }
  res.render(jadeFile, {
    title: 'designo',
    loginm: loginMessage,
    loginto: loginTo,
    screen_name: screenName
  });
});

app.get('/login', function(req, res){
  var tw = new Twitter(consumerKey, consumerSecret);
  tw.getRequestToken(function(error, url){
    if(error){
      req.session.destroy(function(){
        console.error(error);
        res.writeHead(500, {'Content-Type': 'text/html'});
        res.send('ERROR :' + error);
      });
    }else{
      req.session.oauth = tw;
      res.redirect(url);
    }
  });
});

app.get('/logout', function(req, res){
  req.session.destroy(function(){
    res.redirect('/');
  });
});

// authorized callback from twitter.com
app.get('/authorized', function(req, res){
  if( !req.session.oauth ){
    res.redirect('/'); // invalid callback url access;
  }else{
    var tw = new Twitter(consumerKey, consumerSecret, req.session.oauth);
    tw.getAccessToken(req.query.oauth_verifier, function(error){
      if(error){
        req.session.destroy(function(){
          console.error(error);
          res.send(error);
        });
      }else{
        req.session.oauth = tw;
        res.redirect('/');
      }
    });
  }
});

// Only listen on $ node app.js

if (!module.parent) {
  app.listen(8080);
  console.log('Express server listening on port '+app.address().port);
}

var io = require('socket.io').listen(app);
// Based on http://www.danielbaulig.de/socket-ioexpress/
io.set('authorization', function (data, accept){
  if(data.headers.cookie){
    var parseCookie = require('connect').utils.parseCookie;
    data.cookie = parseCookie(data.headers.cookie);
    data.sessionID = data.cookie['express.sid'];
    // save the session store to the data object 
    // (as required by the Session constructor)
    data.sessionStore = sessionStore;
    sessionStore.get(data.sessionID, function (err, session){
      if(err){
        accept(err.message, false);
      }else{
        // create a session object, passing data as request and our
        // just acquired session data
        var Session = require('connect').middleware.session.Session;
        data.session = new Session(data, session);
        accept(null, true);
      }
    });
  } else {
   return accept('No cookie transmitted.', false);
  }
});

io.sockets.tid2clt = {};
io.sockets.broadcastTo = function(to, message){ //to has to be an Array
  try{
    for(var i=to.length; i--;){
      var clt = this.tid2clt[to[i]];
      if(clt){
        if(this.flags.json){
          clt.json.send(message);
        }else{
          clt.send(message);
        }
      }
    }
  }catch(e){
    console.error('broadcastTo ERROR: '+e);
  }
  return this;
};
var count = 0,
    maxcount = 0;
io.sockets.on('connection', function(client){
  count++;
  client.json.broadcast.send({count: count});
  client.json.send({count: count});
  if(count>maxcount){
    console.log('maxcount: '+(maxcount=count));
  }
// Based on http://www.danielbaulig.de/socket-ioexpress/
  var hs = client.handshake;
  var session = hs.session;
  var sessionID = hs.sessionID;
  console.log('A client with sessionID '+sessionID+' connected!');
  // setup an inteval that will keep our session fresh

  if(session.oauth){
    var tw = new Twitter(consumerKey, consumerSecret, session.oauth);
    try{
      io.sockets.tid2clt[tw._results.user_id] = client;
    }catch(e){
      console.error('io.sockets.tid2sid ERROR: ' + e);
    }
    //view home
    var scroll = function(params){
      tw.getTimeline(params, function(error, data, response){
        if(error){
          console.error('TIMELLINE ERROR: ' + error);
        }else{
          client.json.send(data);
          //req.session.page.push(data);
        }
      });
    };
    scroll({page: 1, include_entities: true});
    //user streams
    var usParams = {include_entities: true},
        stream = tw.openUserStream(usParams);
    stream.on('data', function(data){
      try{
        if(data.friends){
        }else{
          client.json.send(data);
        }
      }catch(e){
        console.error('dispatch event ERROR: ' + e);
      }
    });
    stream.on('error', function(err){
      session.destroy(function(){
        console.error('UserStream ERROR: ' + err);
      });
    });
    stream.on('end', function(){
      session.destroy(function(){
        console.log('UserStream ends successfully');
      });
    });
  }

  client.on('message', function(message){
    //message
    if(tw){
      //manage followers
      if(!client.followers){
        tw.followers(function(error, data, response){
          if(error){
            console.error('FOLLOWERS ERROR: ' + error);
          }else{
            client.followers = data;
          }
        });
      }
      if(message.text){
        tw.update(message, function(error, data, response){
          if(error){
            console.error("UPDATE ERROR\ndata: "+data+'response: '+response+'oauth: '+tw+'message: '+message);
          }else{
            client.json.send(data);
            io.sockets.json.broadcastTo(client.followers, data);
          }
        });
      }
    }
  });
  client.on('retweet', function(message){
    tw.retweet(message.id_str, function(error, data, response){
      if(error){
        console.error("RETWEET ERROR\ndata: "+data+'response: '+response+'oauth: '+tw+'message: '+message);
      }else{
        client.json.send(data);
        io.sockets.json.broadcastTo(client.followers, data);
      }
    });
  });
  client.on('destroy', function(message){
    tw.destroy(message.id_str, function(error, data, response){
      if(error){
        console.error("DELETE ERROR\ndata: "+data+'response: '+response+'oauth: '+tw+'message: '+message);
      }
    });
  });
  client.on('scroll', function(message){
    scroll(message);
  });
  client.on('disconnect', function(){
    count--;
    client.json.broadcast.send({count: count});
  });
  // Based on http://www.danielbaulig.de/socket-ioexpress/
  var intervalID = setInterval(function(){
      // reload the session (just in case something changed,
      // we don't want to override anything, but the age)
      // reloading will also ensure we keep an up2date copy
      // of the session with our connection.
      session.reload(function(){ 
          // "touch" it (resetting maxAge and lastAccess)
          // and save it back again.
          session.touch().save();
      });
  }, 60*1000);
  client.on('disconnect', function(){
    console.log('A client with sessionID '+sessionID+' disconnected!');
    // clear the client interval to stop refreshing the session
    clearInterval(intervalID);
  });
});
