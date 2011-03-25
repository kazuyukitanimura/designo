$(function(){
  var socket = new io.Socket();
  socket.connect();
  var reply_id = '';
  var selected_id = 'all';
  var chatObj = $('#chat');
  var name = $('#name').text();
  var textObj = $('#text').focus();
  var sidebarObj = $('#sidebar');
  var allObj = $('#all');
  var oldestId = '0000000000000000000000000000000000000000000000000';
  var deleteOutDiv = function(id_str){
    var jQid = '#'+id_str;
    var idObj = $(jQid);
    if(idObj.length){
      $('#'+idObj.attr("class")+'.sidebar a span.badge').text(function(i,v){return --v;});
      $('#all.sidebar a span.badge').text(function(i,v){return --v;});
      if(idObj.hasClass('mentions')){
        $('#mentions.sidebar a span.badge').text(function(i,v){return --v;});
      }
    }
    idObj.before($(jQid+'>div').css('margin-left','0px'));
    idObj.remove();
  };
  var isMention = function(str){
    if(str.match('@'+name)){
      $('#mentions.sidebar a span.badge').text(function(i,v){return ++v;});
      return ' mentions';
    }else{
      return '';
    }
  };
  socket.on('message', function(message){
    var re = /((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;//Thanks to http://kawika.org/jquery/js/jquery.autolink.js
    var af = '<a href="$1" target="_blank">$1</a> ';
    var mkLink = function(str){
      return str.replace(re, af);
    };
    $.fn.hoverBio = function(target){
      target = target||this;
      return this.each(function(){
        $(this).hover(
          function(e){
            $(target).children(".bio").css("left",e.pageX+10).css("top",e.pageY).show();
          },function(){
            $(target).children(".bio").hide();
          } 
        );
      });
    };
    $.fn.hoverPic = function(){
      return this.each(function(){
        $(this).find("a").each(function(){
          var href = $(this).attr('href');
          var twitpic = href.match(/http:\/\/twitpic.com\/(\w+)/) ? "http://twitpic.com/show/thumb/"+RegExp.$1 : null;
          var yfrog = href.match(/http:\/\/yfrog.com\/(\w+)/) ? "http://yfrog.com/"+RegExp.$1+':small' : null;
          var plixi= href.match(/http:\/\/plixi.com\/p\/(\w+)/) ? "http://api.plixi.com/api/tpapi.svc/imagefromurl?size=thumbnail&url="+href : null;
          var url = twitpic||yfrog||plixi;
          if(url){
            $(this).append('<img src="'+url+'" class="twitpic"/>').css("font-weight","bold").hover(
              function(e){
                $(this).children("img").css("left",e.pageX+10).css("top",e.pageY).show();
              },function(){
                $(this).children("img").hide();
              } 
            );
          }
        });
      });
    };
    if(message.count){
      $('#count').text(message.count);
    }else if(message['delete']){
      deleteOutDiv(message['delete'].status.id_str);
    }else{
      if(message.text){
        var user = message.user;
        var id = message.id_str;
        var uid = user.id_str;
        var jQid = '#'+id;
        var jQuid = '#'+uid;

        var scroll = false;
        if((id.length===oldestId.length && id<oldestId) || id.length<oldestId.length){
          oldestId = id;
          scroll = true;
        }

        var p_str = '<p><a href="#" onclick="select(\''+uid+'\');"><img src="'+user.profile_image_url+'" class="profile"/></a> '+mkLink(message.text)+'</p><span class="permalink"><span><time class="sec" datetime="'+message.created_at+'"></time> via</span> '+message.source+' | </span>';
        var d_str = '<div id='+id+' class="'+uid+isMention(message.text)+'">'+p_str+'</div>';
        var rp_str = '<a onclick="reply(\''+id+'\',\''+user.screen_name+'\');" href="#">Reply</a>';
        var rt_str = '<a onclick="retweet(\''+id+'\');" href="#">Retweet</a>';
        var dl_str = '<a onclick="destroy(\''+id+'\');" href="#">Delete</a>';
        var bioObj = $('<div id='+uid+' class="sidebar" onclick="select(\''+uid+'\');"><a href="#"><img src="'+user.profile_image_url+'" /> (<span class="badge">0</span>) '+user.screen_name+'</a><div class="bio"><img src="'+user.profile_image_url+'" /><span><b class="fullname">'+user.name+'</b><br/><span>@'+user.screen_name+'</span><br/>'+user.location+'<br/><b>Web:</b> '+mkLink(''+user.url)+'<br/><b>Bio:</b> '+user.description+'</span></div></div>').hoverBio();
        var idObj = $(jQid);
        var uidObj = $(jQuid);
        if(scroll || !(idObj.length)){
          if(idObj.length){
            idObj.html(p_str).addClass(uid);
          }else if(scroll){
            chatObj.append(d_str);
          }else{
            chatObj.prepend(d_str);
          }
          idObj.hoverPic();
          if(user.screen_name===name){
            $(jQid).append('<span class="permalink">'+rp_str+' - '+dl_str+'</span>');
          }else{
            $(jQid).append('<span class="permalink">'+rt_str+' - '+rp_str+'</span>');
          }
          if(uid!==selected_id && selected_id !== 'all'){
            $(jQid+'> :not(:has(.'+selected_id+'), .'+selected_id+')').hide();
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
          }else if(!scroll){
            allObj.after(uidObj);
          }
          $(jQuid+'.sidebar a span.badge').text(function(i,v){return ++v;});
          $('#all.sidebar a span.badge').text(function(i,v){return ++v;});
          $(jQid+' p a img.profile').hoverBio(jQuid);
        }
      }else{
        console.log(message);
      }
    }
  });

  $.fn.ago = function(){
    return this.each(function(){
      var timestamp = Date.parse($(this).attr("datetime"));
      var duration = new Date() - timestamp;
      if(duration<60000){
        $(this).text((duration/1000).toPrecision(2)+" secconds ago");
      }else if(duration<3600000){
        $(this).attr('class','min').text((duration/60000).toPrecision(2)+" minutes ago");
      }else if(duration<86400000){
        $(this).attr('class','hr').text((duration/3600000).toPrecision(2)+" hours ago");
      }else if(duration<31*86400000){
        $(this).attr('class','day').text((duration/86400000).toPrecision(2)+" days ago");
      }else{ 
        $(this).attr('class','').text(new Date(timestamp).toLocaleString().replace(/GMT.+/,""));
      }
    });
  };
  setInterval(function(){ $('time.sec').ago(); },1000);
  setInterval(function(){ $('time.min').ago(); },60000/6);
  setInterval(function(){ $('time.hr').ago(); },3600000/4);
  setInterval(function(){ $('time.day').ago(); },86400000/3);

  textObj.keydown(function(e){
    if((e.keyCode||e.which)===13){
      document.send();
      e.preventDefault();
    }
  });
  textObj.keyup(function(e){
    $('#countChar').text(140-$(this).text().length);
  });

  socket.on('disconnect', function(){
    setTimeout(function(){window.location.reload();}, 10000);
  });

  this.retweet = function(id_str){
    socket.send({retweet: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  };

  var reid = /(@[\w?=&.\/-9;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;
  this.reply = function(id_str, screen_name){
    var ats = $('#'+id_str).text().match(reid);
    var redundant = new RegExp('@('+screen_name+'|'+name+') ','g');
    ats ? textObj.text('@'+screen_name+' '+(jQuery.unique(ats).join(' ')+' ').replace(redundant, '')) : textObj.text('@'+screen_name+' ');
    textObj.focus();
    reply_id = id_str;
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
      socket.send({text: text, in_reply_to_status_id: reply_id});
      textObj.text('');
      reply_id = '';
      textObj.focus();
    }else{
      alert("Oops, blank message...");
    }
    return false;
  };

  this.select = function(id_str){
    selected_id = id_str;
    $("#"+id_str+" .bio").hide();
    $('.sidebar').removeAttr('style');
    $('#'+id_str).css('background', '#ddd');
    $('#chat').find(':hidden:not(.twitpic)').show();
    if(id_str!=="all"){
      $('#chat> :not(:has(.'+id_str+'), .'+id_str+')').hide();
    }
    return false;
  };

  var page = 1;
  chatObj.scroll(function(){
    if (chatObj[0].scrollHeight - chatObj.height() - chatObj.scrollTop() <= 0){
      socket.send({scroll: {page: ++page}});
    }
  });
});
