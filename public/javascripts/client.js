var SECOND = 1000,
    MINUTE = SECOND * 60,
    HOUR   = MINUTE * 60,
    DAY    = HOUR   * 24,
    MONTH  = DAY    * 31;

if(!$.fn.hoverBio){
  $.fn.hoverBio = function(target){
    var thisObj = $(this[0]),
        targetObj = (target||thisObj).children('.bio');
    return thisObj.hover(
      function(e){
        targetObj.css('left',e.pageX+10).css('top',e.pageY).show();
      },function(){
        targetObj.hide();
      } 
    );
  };
}

if(!$.fn.hoverPic){
  $.fn.hoverPic = function(){
    return  $(this[0]).find('a').each(function(){
      var thisObj = $(this),
          thisImg = thisObj.children('img.twitpic');
      if(thisImg){
        thisObj.hover(
          function(e){
            thisImg.css('left',e.pageX+10).css('top',e.pageY).show();
          },function(){
            thisImg.hide();
          } 
        );
      }
    });
  };
}

if(!$.fn.ago){
  $.fn.ago = function(){
    for(var i=this.length; i--;){
      var thisObj = $(this[i]),
          timestamp = Date.parse(thisObj.attr('datetime')),
          duration = new Date() - timestamp;
      if(duration<MINUTE){
        thisObj.text((duration/SECOND).toPrecision(2)+' secconds ago');
      }else if(duration<HOUR){
        thisObj.attr('class','min').text((duration/MINUTE).toPrecision(2)+' minutes ago');
      }else if(duration<DAY){
        thisObj.attr('class','hr').text((duration/HOUR).toPrecision(2)+' hours ago');
      }else if(duration<MONTH){
        thisObj.attr('class','day').text((duration/DAY).toPrecision(2)+' days ago');
      }else{ 
        thisObj.attr('class','').text(new Date(timestamp).toLocaleString().replace(/GMT.+/,''));
      }
    }
    return this;
  };
}

$(function(){
  var socket = io.connect();
  var windowObj = $(window),
      documentObj = $(document),
      page = 1,
      reply_id = '',
      selected_id = 'all',
      chatObj = $('#chat'),
      name = $('#name').text(),
      textObj = $('#text').focus(),
      sidebarObj = $('#sidebar'),
      allObj = $('#all'),
      oldestId = new Array(50); // the length should be larger than the digits of message.id_str==the newest id as initial value
  var increaseBadge = function(j,v){return ++v;};
  var decreaseBadge = function(j,v){return --v;};
  var deleteOutDiv = function(id_str){
    var jQid = '#'+id_str,
        idObj = $(jQid);
    if(idObj.length){
      $('#'+idObj.attr('class')+'.sidebar a span.badge').text(decreaseBadge);
      $('#all.sidebar a span.badge').text(decreaseBadge);
      if(idObj.hasClass('mentions')){
        $('#mentions.sidebar a span.badge').text(decreaseBadge);
      }
    }
    idObj.before($(jQid+'>div').css('margin-left','0px'));
    idObj.remove();
  };
  socket.on('message', function(message){
    if(message.count){
      $('#count').text(message.count);
    }else if(message['delete']){
      deleteOutDiv(message['delete'].status.id_str);
    }else{
      var messageArray = Array.isArray(message) ? message.reverse() : [message];
      for(var k=messageArray.length; k--;){
        var message=messageArray[k];
        if(message.text){
          var id = message.id_str,
              scroll = false,
              jQid = '#'+id,
              idObj = $(jQid);
          if((id.length===oldestId.length && id<oldestId) || id.length<oldestId.length){
            oldestId = id;
            scroll = true;
          }

          if(scroll || !(idObj.length)){
            var entities = message.entities,
                urls = entities.urls,
                user_mentions = entities.user_mentions,
                text = message.text,
                mentioned = false,
                user = message.user,
                uid = user.id_str,
                jQuid = '#'+uid,
                screen_name = user.screen_name,
                profile_image_url = user.profile_image_url,
                in_reply_to_status_id_str = message.in_reply_to_status_id_str,
                uidObj = $(jQuid);
            // TODO retweets should be merged with the original
            for(var i=urls.length, j=user_mentions.length; (i--)+(j--);){
              if(j<0 || (i>=0 && urls[i].indices[0]>user_mentions[j].indices[0])){// check j and i first
                var href = urls[i].expanded_url,
                    src = href.match(/http:\/\/twitpic\.com\/(\w+)/) ? 'http://twitpic.com/show/thumb/'+RegExp.$1 :
                          href.match(/http:\/\/yfrog\.com\/(\w+)/) ? 'http://yfrog.com/'+RegExp.$1+':small' :
                          href.match(/http:\/\/instagr\.am\/p\/(\w+)/) ? 'http://instagr.am/p/'+RegExp.$1+'/media/?size=t' :
                          href.match(/http:\/\/i\.imgur\.com\/(\w+)\.jpg/) ? 'http://i.imgur.com/'+RegExp.$1+'s.jpg' :
                          href.match(/http:\/\/plixi\.com\/p\//) ? 'http://api.plixi.com/api/tpapi.svc/imagefromurl?size=thumbnail&url='+href : null,
                    img = src ? ' style="font-weight:bold">'+href+'<img src="'+src+'" class="twitpic"/>' : '>'+href;
                text = text.slice(0, urls[i].indices[0])+'<a href="'+href+'" target="_blank"'+img+'</a>'+text.slice(urls[i].indices[1]);
                ++j;// put back the other one
              }else{
                mentioned = (user_mentions[j].screen_name === name);// true or false
                text = text.slice(0, user_mentions[j].indices[0]) +
                        '@<a href="#" onclick="select(\''+user_mentions[j].id+'\');" style="text-decoration:none;color:#2e991b">' + 
                        user_mentions[j].screen_name + '</a>' + text.slice(user_mentions[j].indices[1]);
                ++i;// put back the other one
              }
            }
            var p_str = '<p><a href="#" onclick="select(\''+uid+'\');"><img src="'+profile_image_url+'" class="profile"/></a> '+text+'</p><span class="permalink"><span><time class="sec" datetime="'+message.created_at+'"></time> from</span> '+message.source+' | </span>',
                rp_str = '<a onclick="reply(\''+id+'\',\''+screen_name+'\');" href="#">Reply</a>';
            if(screen_name===name){
              p_str += '<span class="permalink">'+rp_str+' - <a onclick="destroy(\''+id+'\');" href="#">Delete</a></span>';
            }else{
              p_str += '<span class="permalink"><a onclick="retweet(\''+id+'\');" href="#">Retweet</a> - '+rp_str+'</span>';
            }
            if(idObj.length){
              idObj.html(p_str).addClass(uid);
            }else{
              var d_str = '<div id='+id+' class="'+uid+'">'+p_str+'</div>';
              if(scroll){
                chatObj.append(d_str);
              }else{
                chatObj.prepend(d_str);
              }
            }
            $(jQid).hoverPic();
            if(in_reply_to_status_id_str){
              if(scroll){
                $(jQid).append('<div id='+in_reply_to_status_id_str+' style="margin-left: 14px;"></div>');
              }else{
                $(jQid).append($('#'+in_reply_to_status_id_str).css('margin-left', '14px'));
              }
            }
            if(!(uidObj.length)){
              var bioObj = $('<div id='+uid+' class="sidebar" onclick="select(\''+uid+'\');"><a href="#"><img src="'+profile_image_url+'" /> (<span class="badge">0</span>) '+screen_name+'</a><div class="bio"><img src="'+profile_image_url+'" /><span><b class="fullname">'+user.name+'</b><br/><span>@'+screen_name+'</span><br/>'+user.location+'<br/><b>Web:</b> <a href="'+user.url+'" target="_blank">'+user.url+'</a><br/><b>Bio:</b> '+user.description+'</span></div></div>').hoverBio();
              if(scroll){
                sidebarObj.append(bioObj);
              }else{
                allObj.after(bioObj);
              }
              uidObj = $(jQuid);
            }else if(!scroll){
              allObj.after(uidObj);
            }
            $(jQuid+'.sidebar a span.badge').text(increaseBadge);
            $('#all.sidebar a span.badge').text(increaseBadge);
            if(mentioned){
              $('#mentions.sidebar a span.badge').text(increaseBadge);
              $(jQid).addClass('mentions');
            }
            if(uid!==selected_id && selected_id !== 'all'){
              $(jQid+' :not(:has(.'+selected_id+'))').parentsUntil('#chat').hide();
            }
            $(jQid+' p a img.profile').hoverBio(uidObj);
            $(jQid).data('user_mentions', user_mentions);
          }
        }else{
          console.log(message);
        }
      }
    }
  });

  setInterval(function(){ $('time.sec').ago(); }, SECOND);
  setInterval(function(){ $('time.min').ago(); }, MINUTE/6);
  setInterval(function(){ $('time.hr').ago(); }, HOUR/4);
  setInterval(function(){ $('time.day').ago(); }, DAY/3);

  textObj.keydown(function(e){
    if((e.keyCode||e.which)===13){ // return key
      document.send();
      e.preventDefault();
    }
  });
  textObj.keyup(function(e){
    $('#countChar').text(140-$(this).text().length);
    if(textObj.text()===''){
      reply_id = '';
    }
  });

  this.retweet = function(id_str){
    socket.emit('retweet', {id_str: id_str});
    textObj.focus();
    return false;
  };

  this.reply = function(id_str, screen_name){
    var rms = ['@'+screen_name, ''],
        ums = $('#'+id_str).data('user_mentions');
    for(var i=ums.length; i--;){
      if(ums[i].screen_name !== screen_name && ums[i].screen_name !== name){
        rms.splice(-1, 0, '@'+ums[i].screen_name);
      }
    }
    textObj.text(rms.join(' '));

    textObj.focus();
    reply_id = id_str;
    selected_id = 'reply';
    $('#chat> :not(:has(#'+id_str+'), #'+id_str+')').hide();
    return false;
  };
  
  this.destroy = function(id_str){
    deleteOutDiv(id_str);
    socket.emit('destroy', {id_str: id_str});
    textObj.focus();
    return false;
  };

  this.send = function(){
    var text = textObj.text();
    
    if(text && name){
      socket.emit('update', {text: text, in_reply_to_status_id: reply_id, include_entities: true});
      textObj.text('');
      reply_id = '';
      textObj.focus();
      this.select('all');
    }else{
      alert('Oops, blank message...');
    }
    return false;
  };

  this.select = function(id_str){
    selected_id = id_str;
    $('#'+id_str+' .bio').hide();
    $('.sidebar').css('background', '#fff');
    $('#'+id_str).css('background', '#ddd');
    $('#chat').find(':hidden:not(.twitpic)').show();
    if(id_str!=='all'){
      $('#chat> :not(:has(.'+id_str+'), .'+id_str+')').hide();
    }
    return false;
  };

  windowObj.scroll(function(){
    if (documentObj.height() - windowObj.height() - windowObj.scrollTop() <= 0){
      socket.emit('scroll', {page: ++page, include_entities: true});
    }
  });
});
