define(['base/js/namespace','base/js/dialog','jquery'],function(IPython, dialog, $, mc){

    function getCookie(name) {
        "use-strict";
        var r = document.cookie.match("\\b" + name + "=([^;]*)\\b"); return r ? r[1] : undefined; 
    }
    
    /** @function jump 
    *   navigate through the Git settings popup modal: 
    *   jump to previous/next input element on ENTER, KEY_UP, KEY_DOWN 
    */
    function jump(inputs) {
        "use-strict";
        for(var key in inputs){
            inputs[key].keydown(function (e) {
                if (e.which == KeyEvent.DOM_VK_RETURN || e.which == KeyEvent.DOM_VK_DOWN) {
                    try {
                        next_input = this.nextSibling.nextSibling;
                        next_input.focus();
                    } catch (e if e instanceof TypeError) {
                        $('#btn-submit').focus();
                    }
                }

                if (e.which == KeyEvent.DOM_VK_UP) {
                    try {
                        prev_input = this.previousSibling.previousSibling;
                        prev_input.focus();
                    } catch (e if e instanceof TypeError) {}
                }
            });
        }
    }
    
    var specify_git_data = {
        help: 'Register git data',
        help_index : '',
        icon : 'fa-cog',
        handler : function (env) {

            var cmd_palette= $('.typeahead-list');
            var register_opt= $('<li id="git-registration" class="typehead-group" data-search-group="register git"></li>');

            cmd_palette.prepend(register_opt);
            
            var item= $('.typeahead-list').find("[data-search-group='register git']");

            var parent_label= $('<label/>').attr({for: 'parent-dir', title: 'Required'}).text('Git parent directory');
            var parentdir_input = $('<input/>').attr({ type: 'text', id: 'parent-dir', name: 'parent-dir',required: 'true', pattern:'[a-z0-9A-Z/-]'});
            
            var div = $('<div/>').css({
                                'display': 'flex',
                                'flex-direction': 'column',
                                'vertical-align': 'middle'
                                });

            // create git registration inputs
            var inputs= {
                "key": $('<input/>').attr({ type: 'text', id: 'key', name: 'key', disabled:'true'}).css({'visibility' : 'collapse'}),
                "parent-dir": $('<input/>').attr({ type: 'text', id: 'parent-dir', name: 'parent-dir',required: 'true', disabled:'true'}).css({'visibility' : 'collapse'}),
                "remote-url": $('<input/>').attr({ type: 'text', id: 'remote-url', name: 'remote-url',required: 'true', disabled:'true'}).css({'visibility' : 'collapse'}),
                "user":$('<input/>').attr({ type: 'text', id: 'user', name: 'user',required: 'true'}),
                "email": $('<input/>').attr({ type: 'email', id: 'email', name: 'email',required: 'true', placeholder:'you@example.com'}),
                "repo-name": $('<input/>').attr({ type: 'text', id: 'repo-name', name: 'repo-name',required: 'true'}),
                "branch-name": $('<input/>').attr({ type: 'text', id: 'branch-name', name: 'branch-name',required: 'true'}).val('master')
            }

            // create git registration labels
            var labels= {
                "key": $('<label/>').attr({for: 'key', title: 'Your SSH key'}).text('SSH key').css({'visibility' : 'collapse'}),
                "parent-dir": $('<label/>').attr({for: 'parent-dir', title: 'Parent Directory'}).text('Parent Directory').css({'visibility' : 'collapse'}),
                "remote-url": $('<label/>').attr({for: 'remote-url', title: 'Remote URL'}).text('Remote URL').css({'visibility' : 'collapse'}),
                "user":$('<label/>').attr({for: 'user', title: 'Your username'}).text('Username'),
                "email": $('<label/>').attr({for: 'email', title: 'e.g. you@example.com'}).text('Email'),
                "repo-name": $('<label/>').attr({for: 'repo-name', title: 'Required'}).text('Repository name'),
                "branch-name": $('<label/>').attr({for: 'branch-name', title: 'Your branch name: e.g. master'}).text('Branch name')
            }
            
            jump(inputs);
            
            // add child nodes: inputs, labels to parent node div
            for(var key in inputs){
                labels[key].css({'font-size':'1.4rem'});
                inputs[key].css({'margin-bottom': '1.4rem'});
                div.append(labels[key])
                   .append(inputs[key]);
            }
            
            getSettings( function(data){
                if(data.msg.length != 0) {
                    var recv_msg= JSON.parse(data.msg);

                    inputs['key'].val(recv_msg['key']).css({'visibility' : 'visible'});
                    inputs['parent-dir'].val(recv_msg['parent-dir']).css({'visibility' : 'visible'});
                    inputs['remote-url'].val(recv_msg['remote-url']).css({'visibility' : 'visible'});
                    inputs['user'].val(recv_msg['user']);
                    inputs['email'].val(recv_msg['email']);
                    inputs['repo-name'].val(recv_msg['repo-name']);
                    labels['key'].css({'visibility' : 'visible'});
                    labels['parent-dir'].css({'visibility' : 'visible'});
                    labels['remote-url'].css({'visibility' : 'visible'});
                }
                
            });

            function on_submit(){
                var re= /\w+\/*(.ipynb)/;
                var filename = window.location.pathname.match(re)[0];
 
                re= /\/work\/.*\/*(.ipynb)/;
                var filepath = window.location.pathname.match(re)[0];
                filepath= filepath.replace(filename, "");
          
                var payload = {
                             'user': inputs['user'].val(),
                             'email': inputs['email'].val(),
                             'filepath': filepath,
                             'repo-name': inputs['repo-name'].val(),
                             'branch-name': inputs['branch-name'].val()
                           };
                           
                var base_url = window.location.pathname.split('notebooks')[0];
                var _xsrf_cookie = getCookie('_xsrf');
                var container = $('#notebook-container');

                var settings = {
                    url : base_url + 'notebooks/settings',
                    processData : false,
                    type : "POST",
                    headers: {'X-XSRFToken': _xsrf_cookie}, // customized: add the xsrf cookie to request header
                    dataType: "json",
                    data: JSON.stringify(payload), 
                    contentType: 'application/json',
                    success: function(data) {
                        // display feedback to user
                        var container = $('#notebook-container');
                        var feedback = '<div class="commit-feedback alert alert-success alert-dismissible" role="alert"> \
                                          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> \
                                          '+data.statusText+' \
                                           \
                                        </div>';
                        
                        // display feedback
                        $('.commit-feedback').remove();
                        container.prepend(feedback);
                    },
                    error: function(data) {

                        // display feedback to user + error box
                        var feedback = '<div class="commit-feedback alert alert-danger alert-dismissible" role="alert"> \
                                          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> \
                                          <strong>Warning!</strong> Something went wrong. \
                                          <div>'+data.statusText+'</div> \
                                        </div>';

                        // display feedback
                        $('.commit-feedback').remove();
                        container.prepend(feedback);
                    }
                };

                // display preloader during commit and push
                var preloader = '<img class="commit-feedback" src="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.5.8/ajax-loader.gif">';
                container.prepend(preloader);

                // commit and push
                $.ajax(settings);
                
            }

            dialog.modal({
                body: div ,
                title: 'Git Registration',
                buttons: {'Submit':
                            { class:'btn-primary btn-large' ,
                              id:'btn-submit',
                              click: on_submit
                            },
                          'Cancel':{}
                        },
                notebook:env.notebook,
                keyboard_manager: env.notebook.keyboard_manager,
            })
        }
    }

    // we will define an action here that should happen when we ask to clear and restart the kernel.
    var git_commit_push  = {
        help: 'Commit current notebook and push to GitHub',
        icon : 'fa-github',
        help_index : '',
        handler : function (env) {
            var on_success = undefined;
            var on_error = undefined;

            var p = $('<p/>').text("Please enter your commit message. Only this notebook will be committed.")
            var input = $('<textarea rows="4" cols="72"></textarea>')
            var div = $('<div/>')

            div.append(p)
               .append(input)

            // get the canvas for user feedback
            var container = $('#notebook-container');

            function on_ok(){
                // customized: get /filename e.g. /Untitled.ipynb
                var re= /work\/.*\/*(.ipynb)/;
                
                var filepath = window.location.pathname.match(re)[0];
                
                var idx= filepath.lastIndexOf("/");
                filepath= filepath.slice(0, idx);

                var payload = {
                             'filepath': filepath,
                             'msg': input.val(),
                             
                           };

                // customized: get base URL
                var base_url = window.location.pathname.split('notebooks')[0];
                
                // customized: get the xsrf cookie
                var _xsrf_cookie = getCookie('_xsrf');

                var settings = {
                    url : base_url + 'notebooks/git/commit',
                    processData : false,
                    type : "PUT",
                    headers: {'X-XSRFToken': _xsrf_cookie}, 
                    dataType: "json",
                    data: JSON.stringify(payload), 
                    contentType: 'application/json',
                    success: function(data) {

                        // display feedback to user
                        var container = $('#notebook-container');
                        var feedback = '<div class="commit-feedback alert alert-success alert-dismissible" role="alert"> \
                                          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> \
                                          '+data.statusText+' \
                                           \
                                        </div>';
                        
                        // display feedback
                        $('.commit-feedback').remove();
                        container.prepend(feedback);
                    },
                    error: function(data) {

                        // display feedback to user + error box
                        var feedback = '<div class="commit-feedback alert alert-danger alert-dismissible" role="alert"> \
                                          <button type="button" class="close" data-dismiss="alert" aria-label="Close"><span aria-hidden="true">&times;</span></button> \
                                          <strong>Warning!</strong> Something went wrong. \
                                          <div>'+data.statusText+'</div> \
                                        </div>';

                        // display feedback
                        $('.commit-feedback').remove();
                        container.prepend(feedback);
                    }
                };
             
                // display preloader during commit and push
                var preloader = '<img class="commit-feedback" src="https://cdnjs.cloudflare.com/ajax/libs/slick-carousel/1.5.8/ajax-loader.gif">';
                container.prepend(preloader);

                // commit and push
                $.ajax(settings);
            }

            dialog.modal({
                body: div ,
                title: 'Commit and Push Notebook',
                buttons: {'Commit and Push':
                            { class:'btn-primary btn-large',
                              click:on_ok //,
                              // disabled
                            },
                          'Cancel':{}
                    },
                notebook:env.notebook,
                keyboard_manager: env.notebook.keyboard_manager,
            })
        }
    }

    /** @param {string} data contains Git values:
    *   on HTTP Response received: fill input elements with Git values
    */
    function getSettings(callback){
        "use-strict";
        
        var base_url = window.location.pathname.split('notebooks')[0];

        var settings = {
            url : base_url + 'notebooks/settings',
            processData : true,
            type : "GET",
            dataType: "json",
            data: JSON.stringify({}), 
            contentType: 'application/json',
            success: function(data) {
                if ("function" == typeof callback)
                    callback(data);
            },
            error: function(data) {
                console.log("Error: ",data);
            }
        };
    
         $.ajax(settings);
    }
    
    function _on_load(){
        // log to console
        console.info('Loaded Jupyter extension: Git Commit and Push')

        // register new action
        var action_name = IPython.keyboard_manager.actions.register(git_commit_push, 'commit-push', 'jupyter-git')
        var action_name_register=  IPython.keyboard_manager.actions.register(specify_git_data, 'register-git', 'jupyter-git')
        // add button for new action
        IPython.toolbar.add_buttons_group([action_name,action_name_register])

    }

    return {load_ipython_extension: _on_load };
})
