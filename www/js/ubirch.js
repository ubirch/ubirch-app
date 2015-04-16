function ubirchTopo() {
    var REFRESH = 30000,
        mapDimensions = "934.011x661.642".split('x'),
        mapRatio = mapDimensions[0]/mapDimensions[1],
        $app = $('.app'),
        $map = $('.map', $app),
        $detail = $('.detail',$app),
        dayColor = '#333333',
        timeout = null,
        sensors = {};

    function resize() {
        var mapMaskWidth = $map.width(),
            mapMaskHeight = $map.height(),
            svg = d3.select('svg');
        // portrait
        if(mapMaskWidth < mapMaskHeight){
            mapMaskWidth = (mapMaskHeight-25) * mapRatio;
            $('svg',$map).css({marginLeft:($map.width() / 2) - (mapMaskWidth / 2)+'px'});
        // landscape
        } else {
            $('svg',$map).css({marginLeft:''});
        }

        svg.attr('width', mapMaskWidth)
            .attr('height', mapMaskHeight);

        var height = $detail.height();
        $('.bg',$detail).css({backgroundSize:(height+50)+"px"});
    }

    function showDetail(detailData) {
        var $detailContent = $('.content', $detail),
            className = 'visible',
			countryCode = detailData.name.toLowerCase(),
			convertCountries = {uk:'gb'},
            html = '<i class="flag flag-'+(countryCode in convertCountries ? convertCountries[countryCode] : countryCode)+'"></i> <span>' + detailData.country + '</span>',
            updateContent = function () {
                $detailContent
                    .addClass(className)
                    .html(html);
            };

        if ($detailContent.hasClass(className)) {
            $detailContent.removeClass(className);
            if (timeout != null)
                window.clearTimeout(timeout);
            timeout = window.setTimeout(function () {
                updateContent();
            }, 600);
        } else
            updateContent();
    }

    (function handleCredits() {
        var $credits = $('.credits'),
            $leaf = $('.leaf',$credits),
            classClose = 'close',
            classOpen = 'is-open',
            classClossd = 'is-closed';

        $credits.on('click', function(){
            if($credits.hasClass(classOpen)){
                $leaf.removeClass(classClose);
                $credits.addClass(classClossd);
                $credits.removeClass(classOpen);
                window.setTimeout(function(){
                    $credits.removeClass(classClossd);
                },500);
            } else {
                $leaf.addClass(classClose);
                $credits.addClass(classOpen);
            }
        });
        if(app.isPhonegap) {
            $('a', $credits).on('click', function (e) {
                e.stopPropagation();
                e.preventDefault();
                window.open($(event.target).attr('href'), '_system', 'location=yes');
            });
        }
    })();

    (function handleDayColor() {
        var dateNow = new Date(),
            hours = dateNow .getHours();

        $map.removeClass('night-time day-time');
        
        if (hours > 4 && hours < 18){
            $map.addClass('day-time');
        } else {
            $map.addClass('night-time');
        }
    })();

    function apiLoop(country) {
        var info = sensors[country];
        if (!info) return;
        if (!info['feed']) {
            console.log("WARN: feed for "+country+" is missing!");
            return;
        }
        // check if we have a position 0 == map1, 1 == map2
        if(info['pos'][0].indexOf("path") != 0) {
            console.log("WARN: can't locate position for "+country+"!");
            return;
        }

        $.ajax(info['feed']+".json?results=1").done(function (data) {
            var channel = data['channel'], feeds = data['feeds'];
            if(!channel || !feeds || feeds.length == 0) {
                console.log("no data returned for "+country+" feed");
                return;
            }
            try {
                var name = channel['name'];
                if (name != country)
                    console.log("WARN: wrong country queried!");

                var r = feeds[0]['field1'],
                    g = feeds[0]['field2'],
                    b = feeds[0]['field3'];

                d3.select('#' + info['pos'][0])
                    .attr('stroke', '#ffffff')
                    .attr('fill', 'rgb(' + r + "," + g + "," + b + ")")
                    .on('click', function () {
                        showDetail({'name': name, country: channel['description']});
                    });

                $(window).trigger('map:ready');
            } catch(e) {
                console.log(e)
            }
        }).fail(function (e) {
            console.log(e);
        }).always(function () {
            setTimeout(function () {
                apiLoop(country)
            }, REFRESH);
        });
    }

    function handleZoom(forceClose){
        var className = 'zoom-in',
            height = $map.height() / 2;
        if($map.hasClass(className) || forceClose){
            $map.removeClass(className+' top bottom');
        } else {
            $map.addClass(className).removeClass('top bottom');
            if(height > d3.event.y) {
                $map.addClass('top');
            } else {
                $map.addClass('bottom');
            }
        }
    }

    d3.xml('img/Finding_Lights_Republica2015_Map_150415_1.svg', 'image/svg+xml', function (xml) {
        d3.select($map[0]).node().appendChild(xml.documentElement);
        resize();
        d3.select(window).on('resize', resize);

        d3.json("js/sensors.json", function (data) {
            sensors = data;
            $.each(sensors, function(k) { setTimeout(function() { apiLoop(k); }, 0); });
        });

        d3.select('svg').selectAll('path,rect').on('click',function(d){
            handleZoom();
        });
    });
}
