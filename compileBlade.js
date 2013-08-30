var path = Npm.require("path"),
    blade = Npm.require("blade");

Plugin.registerSourceHandler("blade", function(compileStep) {
    var templateName = compileStep.inputPath.replace(/\.blade$/, '');
    //Templates are assumed to be stored in "views/" or "client/views/"
    //so remove this from the name, if needed
    if(templateName.substr(0, 6) == "views/")
        templateName = templateName.substr(6);
    else if(templateName.substr(0, 13) == "client/views/")
        templateName = templateName.substr(13);
    else
        //Remove directory prefix if not in views/ or client/views/
        templateName = templateName.substr(templateName.lastIndexOf("/") + 1);
    //Finally, tell the Blade compiler where these views are stored, so that file includes work.
    //The location of meteor project = srcPath.substr(0, srcPath.length - servePath.length)
    var basedir = compileStep._fullInputPath.substr(0, compileStep._fullInputPath.length - compileStep.inputPath.length);
    blade.compileFile(compileStep.inputPath, {
        'synchronous': true,
        'basedir': basedir,
        'cache': false, //disabled because we only compile each file once anyway
        'minify': false, //would be nice to have access to `no_minify` bundler option
        'includeSource': true //default to true for debugging
    }, function(err, tmpl) {
        if(err) throw err;
        if(templateName == "head")
            tmpl({}, function(err, html) {
                //This should happen synchronously due to compile options set above
                if(err) throw err;
                compileStep.appendDocument({
                    data: html,
                    section: 'head'
                });
            });
        else
        {
            var data = "blade._cachedViews[" +
                //just put the template itself in blade._cachedViews
                JSON.stringify(templateName + ".blade") + "]=" + tmpl.toString() + ";" +
                //define a template with the proper name
                "Template.__define__(" + JSON.stringify(templateName) +
                    //when the template is called...
                    ", function(data, obj) {\ndata = data || {};" +
                        "var template = blade._cachedViews[" + JSON.stringify(templateName + ".blade") + "];" +
                        "var ctx = Object.create(data);" +
                        "_.extend(ctx, Handlebars._default_helpers, obj.helpers);" +
                        //Get `info` Object from the parent template (if any) and its length
                        "var info = blade._includeInfo || [], startLen = info.length;" +
                        //Expose `partials`
                        "info.partials = obj.partials;" +
                        /*call the actual Blade template here, passing in data
                            `ret` is used to capture async results.
                            Note that since we are using caching for file includes,
                            there is no async. All code is ran synchronously. */
                        "var ret = ''; template(ctx, function(err,html,info) {" +
                            "if(err) throw err;" +
                            "html = info.slice(startLen).join('');" +
                            //Remove event handler attributes
                            'html = html.replace(/on[a-z]+\\=\\"return blade\\.Runtime\\.trigger\\(this\\,arguments\\)\\;\\"/g, "");' +
                            //now bind any inline events and return
                            "ret = blade.LiveUpdate.attachEvents(info.eventHandlers, html);" +
                        "},info);\n" +
                        //so... by here, we can just return `ret`, and everything works okay
                        "return ret;" +
                    "}" +
                ");";
            if(templateName == "body")
                data += "Meteor.startup(function(){" +
                        "document.body.appendChild(Spark.render(Template.body));" +
                    "});"
            compileStep.addJavaScript({
                path: "/views/" + templateName + ".js", //This can be changed to whatever
                sourcePath: compileStep.inputPath,
                data: data,
                bare: true
            });
        }
    });
});
