SessionWebSocket(function(socket){
  var reply_id = '';
  var selected_id = 'all';
  var chatObj = $('#chat');
  var name = $('#name').val();
  var textObj = $('#text');
  var sidebarObj = $('#sidebar');
  var allObj = $('#all');
  function deleteOutDiv(id_str) {
    var id = '#'+id_str;
    $(id).before($(id+'>div').css('margin-left','0px'));
    $(id).remove();
  }
  socket.on('message', function(message) {
    function tweetDate(created_at) {
      return new Date(Date.parse(created_at)).toLocaleString().replace(/GMT.+/,"");
    }
    var re = /((http|https|ftp):\/\/[\w?=&.\/-;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;
    var af = '<a href="$1" target="_blank">$1</a> ';
    function mkLink(str){
      return str.replace(re, af);
    }
    $.fn.hoverBio = function(){
      return this.each(function(){
        $(this).hover(
          function(e){
            $(this).children(".bio").css("left",e.pageX+10).css("top",e.pageY).show();
          },function(){
            $(this).children(".bio").hide();
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
          if(url) {
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
    if (message.count) {
      $('#count').text(message.count);
    } else if (message['delete']) {
      deleteOutDiv(message['delete'].status.id_str);
    } else {
      function mkTwtObj(data,scroll) {
        var id = '#'+data.id_str;
        scroll = scroll ? true : false;
        var p_str = '<p><a href="http://twitter.com/'+data.user.screen_name+'" target="_blank"><img src="'+data.user.profile_image_url+'" class="profile"/></a> '+mkLink(data.text)+'</p><span class="permalink"><span>'+tweetDate(data.created_at)+' via</span> '+data.source+' | </span>';
        var d_str = '<div id='+data.id_str+' class='+data.user.id_str+'>'+p_str+'</div>';
        var rp_str = '<a onclick="reply(\''+data.id_str+'\',\''+data.user.screen_name+'\');" href="#">Reply</a>';
        var rt_str = '<a onclick="retweet('+data.id_str+');" href="#">Retweet</a>';
        var dl_str = '<a onclick="destroy(\''+data.id_str+'\');" href="#">Delete</a>';
        var bioObj = $('<div id='+data.user.id_str+' class="sidebar" onclick="select(\''+data.user.id_str+'\');"><a href="#"><img src="'+data.user.profile_image_url+'" /> '+data.user.screen_name+'</a><div class="bio"><img src="'+data.user.profile_image_url+'" /><span><b class="fullname">'+data.user.name+'</b><br/><span>@'+data.user.screen_name+'</span><br/>'+data.user.location+'<br/><b>Web:</b> '+mkLink(''+data.user.url)+'<br/><b>Bio:</b> '+data.user.description+'</span></div></div>').hoverBio();
        if(scroll) {
          if($(id).length) {
            $(id).html(p_str).addClass(data.user.id_str);
          } else {
            chatObj.append(d_str);
          }
          $(id).hoverPic();
          if(data.user.screen_name==name) {
            $(id).append('<span class="permalink">'+rp_str+' - '+dl_str+'</span>');
          } else{
            $(id).append('<span class="permalink">'+rt_str+' - '+rp_str+'</span>');
          }
          if(data.user.id_str!=selected_id && selected_id != 'all'){
            $(id).hide();
          }
          if(data.in_reply_to_status_id_str) {
            $(id).append('<div id='+data.in_reply_to_status_id_str+' style="margin-left: 14px;"></div>');
          }
          if(!($('#'+data.user.id_str).length)){
            sidebarObj.append(bioObj);
          }
        } else{
          if(!($(id).length)) {
            chatObj.prepend(d_str);
            $(id).hoverPic();
            if(data.user.screen_name==name) {
              $(id).append('<span class="permalink">'+rp_str+' - '+dl_str+'</span>');
            } else{
              $(id).append('<span class="permalink">'+rt_str+' - '+rp_str+'</span>');
            }
            if(data.in_reply_to_status_id_str) {
              $(id).append($('#'+data.in_reply_to_status_id_str).css('margin-left', '14px'));
            }
            if($('#'+data.user.id_str).length){
              $('#'+data.user.id_str).remove();
            }
            allObj.after(bioObj);
          }
        }
      }
      if (message.scroll) {
        for (var i = 0, l = message.scroll.length; i < l; i++){
          mkTwtObj(message.scroll[i],true);
        }
      } else if (message.text) {
        mkTwtObj(message,false);
      }
    }
  });

  socket.on('disconnect', function(){
    setTimeout("window.location.reload()", 10000);
  });

  this.retweet = function(id_str) {
    socket.send({retweet: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  }

  var reid = /(@[\w?=&.\/-9;#~%-]+(?![\w\s?&.\/;#~%"=-]*>))/g;
  this.reply = function(id_str, screen_name) {
    textObj.focus();
    var ats = $('#'+id_str).text().match(reid);
    var redundant = new RegExp('@('+screen_name+'|'+name+') ','g');
    ats ? textObj.val('@'+screen_name+' '+(jQuery.unique(ats).join(' ')+' ').replace(redundant, '')) : textObj.val('@'+screen_name+' ');
    reply_id = id_str;
    return false;
  }
  
  this.destroy = function(id_str) {
    deleteOutDiv(id_str);
    socket.send({destroy: {status: {id_str: id_str}}});
    textObj.focus();
    return false;
  }

  this.send = function () {
    var text = textObj.val();
    
    if (text && name) {
      var time = new Date().getTime();
      socket.send({user: {screen_name: name}, text: text, created_at: (new Date()).toString(), in_reply_to_status_id: reply_id});
      textObj.val('');
      reply_id = '';
      textObj.focus();
    } else {
      alert("Oops, blank message...");
    }
    return false;
  }

  this.select = function(id_str) {
    selected_id = id_str;
    $("#"+id_str+" .bio").hide();
    $('.sidebar').removeAttr('style');
    $('#'+id_str).css('background', '#ddd');
    $('#chat> :hidden').show();
    if(id_str!="all") $('#chat> :not(:has(.'+id_str+'), .'+id_str+')').hide();
    return false;
  }

  var page = 1
  chatObj.scroll(function(){
    if (chatObj[0].scrollHeight - chatObj.height() - chatObj.scrollTop() <= 0) {
      socket.send({scroll: {page: ++page}});
    }
  });
});
