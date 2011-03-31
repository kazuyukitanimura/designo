var SECOND = 1000,
    MINUTE = SECOND * 60,
    HOUR   = MINUTE * 60,
    DAY    = HOUR   * 24,
    MONTH  = DAY    * 31;


$.fn.hoverBio = function(target){
  var thisObj = $(this[0]),
      targetObj = target||thisObj;
  return thisObj.hover(
    function(e){
      targetObj.children('.bio').css('left',e.pageX+10).css('top',e.pageY).show();
    },function(){
      targetObj.children('.bio').hide();
    } 
  );
};

$.fn.ago = function(){
  return this.each(function(){
    var timestamp = Date.parse($(this).attr('datetime')),
        duration = new Date() - timestamp;
    if(duration<MINUTE){
      $(this).text((duration/SECOND).toPrecision(2)+' secconds ago');
    }else if(duration<HOUR){
      $(this).attr('class','min').text((duration/MINUTE).toPrecision(2)+' minutes ago');
    }else if(duration<DAY){
      $(this).attr('class','hr').text((duration/HOUR).toPrecision(2)+' hours ago');
    }else if(duration<MONTH){
      $(this).attr('class','day').text((duration/DAY).toPrecision(2)+' days ago');
    }else{ 
      $(this).attr('class','').text(new Date(timestamp).toLocaleString().replace(/GMT.+/,''));
    }
  });
};

$(function(){
  var socket = new io.Socket();
  socket.connect();
  var reply_id = '',
      selected_id = 'all',
      chatObj = $('#chat'),
      name = $('#name').text(),
      textObj = $('#text').focus(),
      sidebarObj = $('#sidebar'),
      allObj = $('#all'),
      oldestId = '0000000000000000000000000000000000000000000000000';
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
    //Thanks to http://kawika.org/jquery/js/jquery.autolink.js
    var re = /((http|https|ftp):\/\/[\w?=&.\/-;#~%\-]+(?![\w\s?&.\/;#~%"=\-]*>))/g,
        af = '<a href="$1" target="_blank">$1</a> ';
    // ToDO replace the following two functions using entities.urls.indices
    var mkLink = function(str){
      return str.replace(re, af);
    };
    $.fn.hoverPic = function(){
      return  $(this[0]).find('a').each(function(){
        var thisObj = $(this),
            href = thisObj.attr('href'),
            url = href.match(/http:\/\/twitpic.com\/(\w+)/) ? 'http://twitpic.com/show/thumb/'+RegExp.$1 :
                  href.match(/http:\/\/yfrog.com\/(\w+)/) ? 'http://yfrog.com/'+RegExp.$1+':small' :
                  href.match(/http:\/\/plixi.com\/p\/(\w+)/) ? 'http://api.plixi.com/api/tpapi.svc/imagefromurl?size=thumbnail&url='+href : null;
        if(url){
          thisObj.append('<img src="'+url+'" class="twitpic"/>').css('font-weight','bold').hover(
            function(e){
              thisObj.children('img').css('left',e.pageX+10).css('top',e.pageY).show();
            },function(){
              thisObj.children('img').hide();
            } 
          );
        }
      });
    };
    if(message.count){
      $('#count').text(message.count);
    }else if(message['delete']){
      deleteOutDiv(message['delete'].status.id_str);
    }else{
      if(message.text){
        var user = message.user,
            id = message.id_str,
            uid = user.id_str,
            jQid = '#'+id,
            jQuid = '#'+uid,
            scroll = false,
            user_mentions = message.entities.user_mentions;
        if((id.length===oldestId.length && id<oldestId) || id.length<oldestId.length){
          oldestId = id;
          scroll = true;
        }

        var p_str = '<p><a href="#" onclick="select(\''+uid+'\');"><img src="'+user.profile_image_url+'" class="profile"/></a> '+mkLink(message.text)+'</p><span class="permalink"><span><time class="sec" datetime="'+message.created_at+'"></time> from</span> '+message.source+' | </span>',
            d_str = '<div id='+id+' class="'+uid+'">'+p_str+'</div>',
            rp_str = '<a onclick="reply(\''+id+'\',\''+user.screen_name+'\');" href="#">Reply</a>',
            rt_str = '<a onclick="retweet(\''+id+'\');" href="#">Retweet</a>',
            dl_str = '<a onclick="destroy(\''+id+'\');" href="#">Delete</a>',
            bioObj = $('<div id='+uid+' class="sidebar" onclick="select(\''+uid+'\');"><a href="#"><img src="'+user.profile_image_url+'" /> (<span class="badge">0</span>) '+user.screen_name+'</a><div class="bio"><img src="'+user.profile_image_url+'" /><span><b class="fullname">'+user.name+'</b><br/><span>@'+user.screen_name+'</span><br/>'+user.location+'<br/><b>Web:</b> '+mkLink(''+user.url)+'<br/><b>Bio:</b> '+user.description+'</span></div></div>').hoverBio(),
            idObj = $(jQid),
            uidObj = $(jQuid);
        if(scroll || !(idObj.length)){
          if(idObj.length){
            idObj.html(p_str).addClass(uid);
          }else if(scroll){
            chatObj.append(d_str);
          }else{
            chatObj.prepend(d_str);
          }
          $(jQid).hoverPic();
          if(user.screen_name===name){
            $(jQid).append('<span class="permalink">'+rp_str+' - '+dl_str+'</span>');
          }else{
            $(jQid).append('<span class="permalink">'+rt_str+' - '+rp_str+'</span>');
          }
          if(message.in_reply_to_status_id_str){
            if(scroll){
              $(jQid).append('<div id='+message.in_reply_to_status_id_str+' style="margin-left: 14px;"></div>');
            }else{
              $(jQid).append($('#'+message.in_reply_to_status_id_str).css('margin-left', '14px'));
            }
          }
          if(!(uidObj.length)){
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
          for(var i=user_mentions.length; i--;){
            if(user_mentions[i].screen_name === name){
              $('#mentions.sidebar a span.badge').text(increaseBadge);
              $(jQid).addClass('mentions');
              break;
            }
          }
          if(uid!==selected_id && selected_id !== 'all'){
            $(jQid+' :not(:has(.'+selected_id+'))').parentsUntil('#chat').hide();
          }
          $(jQid+' p a img.profile').hoverBio(uidObj);
        }
      }else{
        console.log(message);
      }
    }
  });

  setInterval(function(){ $('time.sec').ago(); },SECOND);
  setInterval(function(){ $('time.min').ago(); },MINUTE/6);
  setInterval(function(){ $('time.hr').ago(); },HOUR/4);
  setInterval(function(){ $('time.day').ago(); },DAY/3);

  textObj.keydown(function(e){
    if((e.keyCode||e.which)===13){
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

  socket.on('disconnect', function(){
    setTimeout(function(){window.location.reload();}, 10*SECOND);
  });

  this.retweet = function(id_str){
    socket.send({retweet: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  };

  this.reply = function(id_str, screen_name){
    var reid = /(@[\w?=&.\/-9;#~%\-]+(?![\w\s?&.\/;#~%"=\-]*>))/g,
        ats = $('#'+id_str).text().match(reid),
        redundant = new RegExp('@('+screen_name+'|'+name+') ','g');
    if(ats){
      textObj.text('@'+screen_name+' '+($.unique(ats).join(' ')+' ').replace(redundant, ''));
    }else{
      textObj.text('@'+screen_name+' ');
    }
    textObj.focus();
    reply_id = id_str;
    selected_id = 'reply';
    $('#chat> :not(:has(#'+id_str+'), #'+id_str+')').hide();
    return false;
  };
  
  this.destroy = function(id_str){
    deleteOutDiv(id_str);
    socket.send({destroy: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  };

  this.send = function(){
    var text = textObj.text();
    
    if(text && name){
      socket.send({text: text, in_reply_to_status_id: reply_id, include_entities: true});
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
    $('.sidebar').removeAttr('style');
    $('#'+id_str).css('background', '#ddd');
    $('#chat').find(':hidden:not(.twitpic)').show();
    if(id_str!=='all'){
      $('#chat> :not(:has(.'+id_str+'), .'+id_str+')').hide();
    }
    return false;
  };

  var page = 1,
      windowObj = $(window);
  windowObj.scroll(function(){
    if ($(document).height() - windowObj.height() - windowObj.scrollTop() <= 0){
      socket.send({scroll: {page: ++page, include_entities: true}});
    }
  });
});
