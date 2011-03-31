
/**
 * Module dependencies.
 */

var express = require('express'),
    RedisStore = require('connect-redis'),
    io = require('socket.io'),
    Twitter = require('./twitter');

var app = module.exports = express.createServer();

var consumerKey = 'your consumer key',
    consumerSecret = 'your consumer secret';

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.use(express.cookieParser());
  app.use(express.session({ secret: 'himitsu', fingerprint: '', store: new RedisStore() }));
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
      setTimeout(function(){res.redirect('/');}, 500);
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
      console.error(error);
      res.writeHead(500, {'Content-Type': 'text/html'});
      res.send('ERROR :' + error);
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
        console.error(error);
        res.send(error);
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

var socket = io.listen(app);
socket.tid2clt = {};
socket.broadcastTo = function(message, to){ //to has to be an Array
  try{
    for(var i=to.length; i--;){
      var clt = this.tid2clt[to[i]];
      if(clt){
        clt.send(message);
      }
    }
  }catch(e){
    console.error('broadcastTo ERROR: '+e);
  }
  return this;
};
var count = 0,
    maxcount = 0;
require('socket.io-connect');
socket.on('connection', socket.prefixWithMiddleware(function(client,req,res){
  count++;
  client.broadcast({count: count});
  client.send({count: count});
  if(count>maxcount){
    console.log('maxcount: '+(maxcount=count));
  }

  if(req.session.oauth){
    var tw = new Twitter(consumerKey, consumerSecret, req.session.oauth);
    try{
      socket.tid2clt[tw._results.user_id] = client;
    }catch(e){
      console.error('socket.tid2sid ERROR: ' + e);
    }
    //view home
    var scroll = function(params){
      tw.getTimeline(params, function(error, data, response){
        if(error){
          console.error('TIMELLINE ERROR: ' + error);
        }else{
          client.send(data);
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
          client.send(data);
        }
      }catch(e){
        console.error('dispatch event ERROR: ' + e);
      }
    });
    stream.on('error', function(err){
      console.error('UserStream ERROR: ' + err);
      console.log('graceful restarting in 30 seconds');
      setTimeout(function(){stream = tw.openUserStream(usParams);}, 30000);
    });
    stream.on('end', function(){
      console.log('UserStream ends successfully');
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
            client.send(data);
            socket.broadcastTo(data, client.followers);
          }
        });
      }else if(message.retweet){
        tw.retweet(message.retweet.status.id_str, function(error, data, response){
          if(error){
            console.error("RETWEET ERROR\ndata: "+data+'response: '+response+'oauth: '+tw+'message: '+message);
          }else{
            client.send(data);
            socket.broadcastTo(data, client.followers);
          }
        });
      }else if(message.destroy){
        tw.destroy(message.destroy.status.id_str, function(error, data, response){
          if(error){
            console.error("DELETE ERROR\ndata: "+data+'response: '+response+'oauth: '+tw+'message: '+message);
          }
        });
      }else if(message.scroll){
        scroll(message.scroll);
      }
    }
  });
  client.on('disconnect', function(){ //disconnect
    count--;
    client.broadcast({count: count});
  });
}));
