angular.module('docular.plugin.ngdoc', [])
    .controller('docular.plugin.ngdoc.documentationController', ['$scope', 'ngmarkdown', '$sce', '$filter', 'documentation', 'dataFilter', function ($scope, markdownService, $sce, $filter, docService, dataFilter) {
        var doc = $scope.documentationItem;
        var availableDocs = docService.getAllDocuments();
        $scope.docDescription = [];
        
        $scope.docDescription = doc.description.replace(/(<example)/g, "<ng-example").replace(/(<\/example>)/g, "</ng-example>");
        $scope.directiveNameIsParam = false;
        
        var dashFilter = $filter('dashCase');
        $scope.elUsage = [];
        $scope.attrUsage = [];
        $scope.classUsage = [];
        
        if(doc.restrict === undefined) {
            doc.restrict = 'A'; //This is the angular default
        }
        
        if(doc.requires) {
            $scope.dependencies = [];
            for(var i = 0, l = doc.requires.length; i < l; i++) {
                var result = dataFilter(availableDocs, {
                    name: doc.requires[i]
                }), href;
                if(!result.length) {
                    result = dataFilter(availableDocs, {
                        search: {op: 'like', val: doc.requires[i]}
                    });
                }
                if(result.length) {
                    href = '#/documentation/' + result[0].path + '/docApi/' + result[0].name;
                } else {
                    href = '#/search/?query=' + doc.requires[i];
                }
                $scope.dependencies.push({
                    name: doc.requires[i],
                    href: href
                });
            }
        }
        
        $scope.methods = dataFilter(availableDocs, {
            level: {op: 'gt', val: doc.level},
            type: 'method',
            root: doc.root,
            right: {op: 'lt', val: doc.right},
            left: {op: 'gt', val: doc.left}
        });
        
        $scope.events = dataFilter(availableDocs, {
            level: {op: 'gt', val: doc.level},
            type: 'event',
            root: doc.root,
            right: {op: 'lt', val: doc.right},
            left: {op: 'gt', val: doc.left}
        });
        
        $scope.properties = dataFilter(availableDocs, {
            level: {op: 'gt', val: doc.level},
            type: 'property',
            root: doc.root,
            right: {op: 'lt', val: doc.right},
            left: {op: 'gt', val: doc.left}
        });
        
        
        console.log($scope.methods);
        
        $scope.elUsage.push('<' + dashFilter(doc.name));
        $scope.attrUsage.push('<' + (doc.element || 'ANY'));
        $scope.classUsage.push('<' + (doc.element || 'ANY') + ' class="');
        
        var addedDirective = false;
        for(var i = 0, l = doc.params.length; i < l; i++) {
            var param = doc.params[i];
            if(param.varName === doc.name) {
                addedDirective = true;
            }
            
            var attrString = dashFilter(param.varName)+'='+'""';
            var elString = dashFilter(param.altName || param.varName)+'='+'""';
            if(param.optional) {
                attrString = '[' + attrString + ']';
                elString =  '[' + elString + ']';
            }
            var classString = dashFilter(param.varName)+': ;';
            if(param.optional) {
                classString = '[' + classString + ']';
            }
            if(i === l - 1 ) {
                attrString = attrString + '>';
                elString = elString + '>';
            }
            attrString = '    ' + attrString;
            elString = '    ' + elString;
            $scope.elUsage.push(elString);
            $scope.attrUsage.push(attrString);
            $scope.classUsage.push(classString);
            
            param.descriptionRendered = $sce.trustAsHtml(markdownService(param.description));
        }
        if(!addedDirective) {
            $scope.attrUsage.splice(1, 0, '    ' + dashFilter(doc.name));
            $scope.classUsage.splice(1, 0, dashFilter(doc.name) + ';');
        }
        if(doc.params.length === 0) {
            $scope.elUsage[$scope.elUsage.length - 1] += (doc.params.length === 0 ? '>' : '');
            $scope.attrUsage[$scope.attrUsage.length - 1] += (doc.params.length === 0 ? '>' : '');
        }
        
        $scope.elUsage.push('...\n</' + dashFilter(doc.name) + '>');
        $scope.attrUsage.push('...\n</' + (doc.element || 'ANY') + '>');
        $scope.classUsage.push('"> ... </' + (doc.element || 'ANY') + '>');
        
        $scope.elUsage = $scope.elUsage.join('\n');
        $scope.attrUsage = $scope.attrUsage.join('\n');
        $scope.classUsage = $scope.classUsage.join('');
        $scope.example = doc.example ? doc.example.replace(/(<example)/g, "<ng-example").replace(/(<\/example>)/g, "</ng-example>") : false;
    }])
    .directive('paramList', ['ngmarkdown', '$sce', function (markdownService, $sce) {
        return {
            restrict: 'E',
            scope: {
                params: '='
            },
            templateUrl: 'resources/plugins/ngdoc/templates/paramList.html',
            link: {
                post: function ($scope) {
                    $scope.rendered = [];
                    for(var i = 0, l = $scope.params.length; i < l; i++) {
                        $scope.rendered.push($sce.trustAsHtml(markdownService($scope.params[i].description)));
                    }
                }
            }
        }
    }])
    .service('ngmarkdown', ['markdown', 'documentation', 'dataFilter', function (markdownService, docService, dataFilter) {
        return function (content) {
            var availableDocs = docService.getAllDocuments();
            var rendered;
            content = content.replace("<example", "<ng-example").replace("</example>", "</ng-example");
            content = content.replace(/{(@link ([^}]+)\s+([^}]+))}/g, function (matchStr, innerMatch, linkTo, linkName) {
                var href = linkTo;
                
                if(linkTo.indexOf('#') !== -1) {
                    linkTo = linkTo.split('#')[0];
                }

                if(linkTo.indexOf('://') === -1) {
                    var result = dataFilter(availableDocs, {
                        name: linkTo
                    });
                    if(!result.length) {
                        result = dataFilter(availableDocs, {
                            search: {op: 'like', val: linkTo}
                        });
                    }
                    if(result.length) {
                        href = '#/documentation/' + result[0].path + '/docApi/' + result[0].name;
                    } else {
                        href = '#/search/?query=' + linkTo;
                    }
                }
                return "<a href='" + href + "'>" + linkName + '</a>';
            });
            if(content.match(/^[\n\r ]+$/)) {
                return "";
            }
            rendered = markdownService(content);
            return rendered;
        };
    }])
    .filter('dashCase', function () {
        return function (string) {
            return string.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase();
        };
    })
    .directive('ngExampleContainer', ['$compile', 'ngmarkdown', function ($compile, markdownService) {
        return {
            scope: {
                example: '=example',
                group: '='
            },
            restrict: 'E',
            link: function ($scope, $element) {
                var template = $scope.example, example, files = [], i = 0;
                
                example = template.match(/(<ng-example[^>]*>[\s\S]+?(?=<\/ng-example>)<\/ng-example>)/g);
                
                var tempTemplate = markdownService(template.replace(/(<ng-example[^>]*>[\s\S]+?(?=<\/ng-example>)<\/ng-example>)/g, function () {
                    return '\n%%NGTOKEN' + (i++) + '%%\n'
                }));
                
                i = 0;
                template = tempTemplate.replace(/(<p>%%NGTOKEN[0-9]+%%<\/p>)/g, function () {
                    var index = i++;
                    var exampleItem = example[index];
                    exampleItem = exampleItem.replace('<ng-example', '<ng-example example="examples[' + index + ']"')
                    return exampleItem;
                });
                
                i = 0;
                template = template.replace(/(<file[^>]*>[\s\S]+?(?=<\/file>)<\/file>)/g, function (content) {
                    files.push(content);
                    return '<div class="NGFILE" id="NGFILE' + (i++) + '"></div>'
                });
                
                example = $(example ? example.join('') : '');
                $scope.examples = [];
                
                $(example).each(function () {
                    var ex = {
                        deps: $(this).attr('deps'),
                        group: $scope.group,
                        module: $(this).attr('module'),
                        files: []
                    }
                    
                    $(this).find('file').each(function () {
                        var child = $(this);
                        var name = child.attr('name');
                        var split = name.split('.');

                        var indent = null;
                        var content = child.html();
                        var contentLines = content.replace(/\t/g, '    ').split(/[\n\r]/);
                        for(var i = 0, l = contentLines.length; i < l; i++) {
                            var line = contentLines[i];
                            var m = line.match(/([\t\s]+)/);
                            if(m && (indent > m[0].length || indent === null)) {
                                indent = m[0].length;
                            }
                        }
                        var indentRegExp = new RegExp("^( {" + indent + "})", 'gm');
                        content = content.replace(indentRegExp, '');

                        ex.files.push({
                            name: name,
                            content: content,
                            type: split[split.length - 1]
                        });
                    });
                    $scope.examples.push(ex);
                })
                
                var compiled = $compile(template)($scope.$new());
                compiled.each(function () {
                    if($(this).is('.NGFILE')) {
                        var id = $(this).attr('id');
                        var index = parseInt(id.replace('NGFILE', ''), 10);
                        $(this).replaceWith($(files[index]));
                    }
                });
                
                $element.append(compiled);
            }
        };
    }])
    .directive('ngExample', function () {
        return {
            replace: true,
            restrict: 'E',
            templateUrl: 'resources/plugins/ngdoc/templates/ngExample.html',
            scope: {
                example: '='
            },
            link: {
                pre: function ($scope, $element, $attrs) {
                    var example = $scope.example;
                    console.log(example)
                    $scope.files = example.files;
                    $scope.group = example.group;
                    $scope.module = example.module;
                    $scope.deps = example.deps;
                }
            }
        }
    })
    .service('exampleService', ['config', function (config) {
        
        function spider(group, path, results) {
            if(group.path === path) {
                return group;
            } else if (group.groups) {
                for(var i = 0, l = group.groups.length; i < l; i++) {
                    var result = spider(group.groups[i], path, results);
                    if(result) {
                        results.push(result);
                        return group;
                    }
                }
            } else {
                return false;
            }
        }
        
        return {
            getExampleConfig: function (group) {
                var results = [config];
                spider(config, group.path, results);
                
                var exampleConfig = {};
                
                for(var i = 0, l = results.length; i < l; i++) {
                    if(results[i].examples) {
                        exampleConfig = $.extend(true, exampleConfig, results[i].examples);
                    }
                }
                
                return exampleConfig;
            }
        }
    }])
    .directive('exampleRunner', ['$interval', 'config', 'exampleService', function ($interval, config, exampleService) {
        return {
            restrict: 'E',
            replace: true,
            template: '<div class="demoArea well"></div>',
            scope: {
                group: '=',
                files: '=',
                module: '=',
                deps: '='
            },
            link: {
                post: function ($scope, $element) {
                    
                    var exampleConfig = exampleService.getExampleConfig($scope.group);
                    if(exampleConfig.include.angular) {
                        exampleConfig.include.js = ['resources/libraries/angular/angular.js'].concat(exampleConfig.include.js);
                    }
                    
                    var deps = $scope.deps;
                    
                    if(typeof deps == 'string') {
                        deps = deps.split(';');
                    }
                    if(deps) {
                        for(var i = 0, l = deps.length; i < l; i++) {
                            if(deps[i].indexOf('angular') === 0) {
                                exampleConfig.include.js.push('resources/libraries/angular/' + deps[i].replace('.js', '.min.js'));
                            } else {
                                exampleConfig.include.js.push(deps[i]);
                            }
                        }
                    }
                    var iframe = $("<iframe>");
                    iframe.attr('src', 'resources/plugins/ngdoc/templates/example.html?' + JSON.stringify({
                        js: exampleConfig.include.js,
                        css: exampleConfig.include.css,
                        baseUrl: config.baseUrl,
                        autoBootstrap: exampleConfig.autoBootstrap,
                        module: $scope.module
                    }));
                    iframe.appendTo($element);

                    iframe.load(function () {
                        console.log("Example iframe loaded")
                        var iframeDoc = $(iframe.contents());
                        var i, l, tag, file;
                        
                        for (i = 0, l = $scope.files.length; i < l; i++) {
                            file = $scope.files[i];
                            if(file.type === 'js' || file.type === 'css') {
                                switch(file.type.toLowerCase()) {
                                    case 'js': 
                                        tag = iframeDoc[0].createElement('script');
                                    break;
                                    case 'css': 
                                        tag = iframeDoc[0].createElement('style');
                                    break;
                                }

                                iframeDoc[0].head.appendChild(tag);
                                try {
                                    tag.innerHTML = file.content;
                                } catch (e) { /* not my problem */ console.log(e); }
                            }
                        }
                        
                        var found = false;
                        for (i = 0, l = $scope.files.length; i < l; i++) {
                            file = $scope.files[i]
                            if(file.type === 'html') {
                                if(!found) {
                                    var content = $('<div>' + file.content + '</div>');
                                    iframeDoc.find('body').append(content);
                                    
                                    content.find('script').each(function () {
                                        var tag = iframeDoc[0].createElement('script');
                                        iframeDoc[0].body.appendChild(tag);
                                        tag.innerHTML = $(this).text();
                                    });
                                    
                                    found = true;
                                } else {
                                    var script = iframeDoc[0].createElement('script');
                                    iframeDoc[0].body.appendChild(script);
                                    script.innerHTML = 'addFileToCache(' + JSON.stringify(file) + ');';
                                }
                            }
                        }
                        
                        if (exampleConfig.autoBootstrap) {
                            var script = iframeDoc[0].createElement('script');
                            iframeDoc[0].body.appendChild(script);
                            if($scope.module) {
                                script.innerHTML = 'angular.bootstrap(document, ["' + $scope.module + '"]);';
                            } else {
                                script.innerHTML = 'angular.bootstrap(document);';
                            }
                        }
                        var resizingInterval = $interval(function () {
                            var height = iframeDoc.find('body').height();
                            iframe.css({
                                minHeight: height
                            });
                        }, 500);
                        $scope.$on('$destroy', function () {
                            $interval.cancel(resizingInterval);
                        });
                    });
                }
            }
        }
    }]);