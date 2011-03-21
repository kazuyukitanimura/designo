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
  function deleteOutDiv(id_str){
    var id = '#'+id_str;
    if($(id).length){
      var uid = '#' + $(id).attr("class");
      $(uid+'.sidebar a span.badge').text(function(i,v){return --v;});
      $('#all.sidebar a span.badge').text(function(i,v){return --v;});
    }
    $(id).before($(id+'>div').css('margin-left','0px'));
    $(id).remove();
  }
  socket.on('message', function(message){
    var re = /((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;//Thanks to http://kawika.org/jquery/js/jquery.autolink.js
    var af = '<a href="$1" target="_blank">$1</a> ';
    function mkLink(str){
      return str.replace(re, af);
    }
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
    }
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
    }
    if(message.count){
      $('#count').text(message.count);
    }else if(message['delete']){
      deleteOutDiv(message['delete'].status.id_str);
    }else{
      if(message.text){
        var data = message;
        var id = '#'+data.id_str;
        var uid = '#'+data.user.id_str;

        var len1 = data.id_str.length;
        var len2 = oldestId.length;
        var scroll = false;
        if((len1===len2 && data.id_str<oldestId) || len1<len2){
          oldestId = data.id_str;
          scroll = true;
        }

        var p_str = '<p><a href="#" onclick="select(\''+data.user.id_str+'\');"><img src="'+data.user.profile_image_url+'" class="profile"/></a> '+mkLink(data.text)+'</p><span class="permalink"><span><time class="sec" datetime="'+data.created_at+'"></time> via</span> '+data.source+' | </span>';
        var d_str = '<div id='+data.id_str+' class='+data.user.id_str+'>'+p_str+'</div>';
        var rp_str = '<a onclick="reply(\''+data.id_str+'\',\''+data.user.screen_name+'\');" href="#">Reply</a>';
        var rt_str = '<a onclick="retweet(\''+data.id_str+'\');" href="#">Retweet</a>';
        var dl_str = '<a onclick="destroy(\''+data.id_str+'\');" href="#">Delete</a>';
        var bioObj = $('<div id='+data.user.id_str+' class="sidebar" onclick="select(\''+data.user.id_str+'\');"><a href="#"><img src="'+data.user.profile_image_url+'" /> (<span class="badge">0</span>) '+data.user.screen_name+'</a><div class="bio"><img src="'+data.user.profile_image_url+'" /><span><b class="fullname">'+data.user.name+'</b><br/><span>@'+data.user.screen_name+'</span><br/>'+data.user.location+'<br/><b>Web:</b> '+mkLink(''+data.user.url)+'<br/><b>Bio:</b> '+data.user.description+'</span></div></div>').hoverBio();
        if(scroll || !($(id).length)){
          if($(id).length){
            $(id).html(p_str).addClass(data.user.id_str);
          }else if(scroll){
            chatObj.append(d_str);
          }else{
            chatObj.prepend(d_str);
          }
          $(id).hoverPic();
          if(data.user.screen_name===name){
            $(id).append('<span class="permalink">'+rp_str+' - '+dl_str+'</span>');
          }else{
            $(id).append('<span class="permalink">'+rt_str+' - '+rp_str+'</span>');
          }
          if(data.user.id_str!=selected_id && selected_id != 'all'){
            $(id).hide();
          }
          if(data.in_reply_to_status_id_str){
            if(scroll){
              $(id).append('<div id='+data.in_reply_to_status_id_str+' style="margin-left: 14px;"></div>');
            }else{
              $(id).append($('#'+data.in_reply_to_status_id_str).css('margin-left', '14px'));
            }
          }
          if(!($(uid).length)){
            if(scroll){
              sidebarObj.append(bioObj);
            }else{
              allObj.after(bioObj);
            }
          }else if(!scroll){
            allObj.after($(uid));
          }
          $(uid+'.sidebar a span.badge').text(function(i,v){return ++v;});
          $('#all.sidebar a span.badge').text(function(i,v){return ++v;});
          $(id+' p a img.profile').hoverBio(uid);
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
  }
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

  socket.on('disconnect', function(){
    setTimeout("window.location.reload()", 10000);
  });

  this.retweet = function(id_str){
    socket.send({retweet: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  }

  var reid = /(@[\w?=&.\/-9;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;
  this.reply = function(id_str, screen_name){
    textObj.focus();
    var ats = $('#'+id_str).text().match(reid);
    var redundant = new RegExp('@('+screen_name+'|'+name+') ','g');
    ats ? textObj.text('@'+screen_name+' '+(jQuery.unique(ats).join(' ')+' ').replace(redundant, '')) : textObj.text('@'+screen_name+' ');
    reply_id = id_str;
    return false;
  }
  
  this.destroy = function(id_str){
    deleteOutDiv(id_str);
    socket.send({destroy: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  }

  this.send = function(){
    var text = textObj.text();
    
    if (text && name) {
      socket.send({user: {screen_name: name}, text: text, created_at: (new Date()).toString(), in_reply_to_status_id: reply_id});
      textObj.val('');
      reply_id = '';
      textObj.focus();
    }else{
      alert("Oops, blank message...");
    }
    return false;
  }

  this.select = function(id_str){
    selected_id = id_str;
    $("#"+id_str+" .bio").hide();
    $('.sidebar').removeAttr('style');
    $('#'+id_str).css('background', '#ddd');
    $('#chat').find(':hidden:not(.twitpic)').show();
    if(id_str!="all") $('#chat> :not(:has(.'+id_str+'), .'+id_str+')').hide();
    return false;
  }

  var page = 1
  chatObj.scroll(function(){
    if (chatObj[0].scrollHeight - chatObj.height() - chatObj.scrollTop() <= 0){
      socket.send({scroll: {page: ++page}});
    }
  });
});
