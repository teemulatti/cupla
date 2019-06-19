/** Cupla Javascript Library - Copyright (c) 2016-2018 CUPLA SOFTWARE Teemu Lätti **/

//--- Compatibility ---

if (typeof(String.prototype.equals) === 'undefined') {
	String.prototype.equals = function(it) { return (this==it); };
}
if (typeof(String.prototype.contains) === 'undefined') {
	String.prototype.contains = function(it) { return (this.indexOf(it) > -1); };
}
if (typeof(String.prototype.includes) === 'undefined') {
	String.prototype.includes = function(it) { return (this.indexOf(it) > -1); };
}
if (typeof(String.prototype.startsWith) === 'undefined') {
	String.prototype.startsWith = function(s) { return (this.substr(0,s.length) == s); };
}
if (typeof(String.prototype.isEmpty) === 'undefined') {
	String.prototype.isEmpty = function() { return (this.length == 0); };
}
if (typeof(Number.isInteger) === 'undefined') {
    Number.isInteger = function(n) { return ((n ^ 0) === n); };
}
if (typeof(Array.prototype.indexOf) === 'undefined') {
    Array.prototype.indexOf = function(obj, start) {
		for (var i = (start || 0); i < this.length; i++) {
			if (this[i] === obj) {
				return i;
			}
		}
		return -1;
    }
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/keys
if (!Object.keys) {
    Object.keys = (function () {
        'use strict';
        var hasOwnProperty = Object.prototype.hasOwnProperty,
        hasDontEnumBug = !({ toString: null }).propertyIsEnumerable('toString'),
        dontEnums = [
          'toString',
          'toLocaleString',
          'valueOf',
          'hasOwnProperty',
          'isPrototypeOf',
          'propertyIsEnumerable',
          'constructor'
        ],
        dontEnumsLength = dontEnums.length;

        return function (obj) {
            if (typeof obj !== 'object' && (typeof obj !== 'function' || obj === null)) {
                throw new TypeError('Object.keys called on non-object');
            }
            var result = [], prop, i;
            for (prop in obj) {
                if (hasOwnProperty.call(obj, prop)) {
                    result.push(prop);
                }
            }
            if (hasDontEnumBug) {
                for (i = 0; i < dontEnumsLength; i++) {
                    if (hasOwnProperty.call(obj, dontEnums[i])) {
                        result.push(dontEnums[i]);
                    }
                }
            }
            return result;
        };
    } ());
}

// From https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/assign
if (!Object.assign) {
    Object.defineProperty(Object, "assign", {
        value: function assign(target, varArgs) {
            'use strict';
            if (!target) throw new TypeError('Cannot convert undefined or null to object');
            var to = Object(target);
            for (var index = 1; index < arguments.length; index++) {
                var nextSource = arguments[index];
                if (nextSource) {
                    for (var nextKey in nextSource) {
                        if (Object.prototype.hasOwnProperty.call(nextSource, nextKey)) {
                            to[nextKey] = nextSource[nextKey];
                        }
                    }
                }
            }
            return to;
        },
        writable: true,
        configurable: true
    });
}

//--- Helper methods ---

function clog(msg) { if (console) console.log(msg); }
function post(func, timeout) { return setTimeout(func, (timeout) ? timeout : 0); }
function parseValidInt(n) { n = parseInt(n); return isNaN(n) ? 0 : n }
function parseValidFloat(n) { n = parseFloat(n); return isNaN(n) ? 0 : n }

//--- Library methods ---

var Cupla = {

    waitForImage: function( image, func ) {
        if ( !image.complete ) {
            image.onload = function() {
                func();
            };
            image.onerror = function() {
                func();
            };
        } else {
            post(func);
        }
    },

    waitForImages: function( images, func ) {
        var f = function( images, index, func ) {
            if ( index < images.length ) {
                Cupla.waitForImage( images[index], function() {
                    f( images, index + 1, func );
                } );
            } else {
                func();
            }
        };
        f( images, 0, func );
    },

    /** Opens page */
    openPage: function(url, newWindow) {
        if (newWindow) {
            window.open(url, '_blank');
        } else {
            window.top.location.assign(url);
        }
    },

    /** Creates async HTTP request to fetch file from url */
    request: function (url, func, user, password) {
        "use strict";
        var httpreq = null;
        if (window.XMLHttpRequest) {
            // IE7, Firefox, Opera, etc
            httpreq = new XMLHttpRequest();
        } else if (window.ActiveXObject) {
            // IE6, IE5
            httpreq = new ActiveXObject("Microsoft.XMLHTTP");
        }
        if (httpreq) {
            httpreq.open("GET", url, true, user, password);
            httpreq.onreadystatechange = function () {
                if (httpreq.readyState == 4) {
                    // 4 = "loaded"
                    var response;
                    if (httpreq.status >= 200 && httpreq.status <= 299) {
                        // 200 = "OK"
                        response = httpreq.responseText;
                    } else if (httpreq.status == 0) {
                        // Usually this hits when request was cancelled due user navigating to other page
                        // (depatable if this happens otherwise also and what we should do here)
                        response = "";
                    } else {
                        //console.log("status="+httpreq.status);
                        response = null;
                    }
                    if (func) {
                        func(response);
                    }
                    httpreq = null; // makes sure we release closure
                }
            };
            httpreq.setRequestHeader("If-Modified-Since", new Date(0)); // no cache
            httpreq.send(null);
            return httpreq;
        } else {
            alert("Your browser does not support XMLHTTP.");
            return null;
        }
    },

    /** Gets request URL parameter value or null */
    getRequestParameter: function(name, defaultValue) {
        if (typeof(window.location.search)!=='undefined') {
            var pms = window.location.search.split('&');
            for (var i=0; i<pms.length; i++) {
                var w = pms[i];
                if (w.charAt(0)=='?') {
                    w = w.substr(1);
                }
                var pm = w.split('=');
                if (pm.length==2 && pm[0].equals(name)) {
                    return pm[1];
                }
            }
        }
        return (typeof(defaultValue)!=='undefined') ? defaultValue : null;
    },

    /** Sets request URL parameter value or removes it (when value is null).
        If you intend to set change multiple variables, push the first one and replace others and implement window.onpopstate()
    */
    setRequestParameter: function(name, value, push /*=true*/) {
        //console.log("name="+name+" value="+value+" push="+push);
        push = (typeof(push)!=='undefined') ? push : true;
        if (typeof(window.location.search)!=='undefined') {
            var v = Cupla.getRequestParameter(name);
            if (v != value) {
                //console.log("name="+name+" "+v+" => "+value);
                var vv = (value!==null && typeof(value)!=='undefined') ? (name + "=" + value) : "";
                var b = true;
                var s = "";
                var pms = window.location.search.split('&');
                for (var i=0; i<pms.length; i++) {
                    var w = pms[i];
                    if (w.charAt(0)=='?') {
                        w = w.substr(1);
                    }
                    //console.log("w:"+w);
                    var pm = w.split('=');
                    if (pm.length==2 && pm[0].equals(name)) {
                        w = vv;
                        b = false;
                    }
                    if (w.length>0) {
                        s += ((s.length>0) ? "&" : "") + w;
                    }
                }
                if (b && vv.length>0) {
                    s += ((s.length>0) ? "&" : "") + vv;
                }
                var req = window.location.protocol + "//" + window.location.host + window.location.pathname;
                if (s.length>0) {
                    req += "?" + s;
                }
                //console.log("req="+req);
                if (history.pushState) {
                    if (push) {
                        //console.log("push="+req);
                        window.history.pushState({ path: req }, '', req);
                    } else {
                        //console.log("replace="+req);
                        window.history.replaceState({ path: req }, '', req);
                    }
                } else {
                    window.location = req;
                }
            }
        }
    },

    /** Gets element by ID within specified element (not whole document) */
    getElementById: function(element, id) {
        "use strict";
        var child = element.firstChild;
        while (child) {
            if (child.id === id) {
                return child;
            }
            var grandchild = Cupla.getElementById( child, id );
            if (grandchild) {
                return grandchild;
            }
            child = child.nextSibling;
        }
        return null;
    },

    /** Gets elements rectangle relative to its parent */
    getElementRect: function(element) {
        var r = element.getBoundingClientRect();
        var rp = (element.parentNode) ? element.parentNode.getBoundingClientRect() : r;
        return {
            left:   r.left   - rp.left,
            top:    r.top    - rp.top,
            right:  r.right  - rp.left,
            bottom: r.bottom - rp.bottom,
            width:  r.width,
            height: r.height,
            x:      r.left   - rp.left,
            y:      r.top    - rp.top,
        };
    },
    
    /** Removes all children under element */
    removeAllChildren: function(elem) {
        while (elem.lastChild) elem.removeChild(elem.lastChild);
    },
    
    /** Creates new HTML div element. className is optional */
    div: function (/*opt*/ className) {
        var element = document.createElement("div");
        if (className) {
            element.className = className;
        }
        return element;
    },
    
    /** Adds all specified event handlers */
    addEventListeners: function(elem, types, func) {
        var t = types.split(" ");
        for (var i in t) {
            elem.addEventListener(t[i], func);
        }
    },
    
    hasClass: function(element, className) {
        return (className.length > 0 && (" " + element.className + " ").indexOf(" " + className + " ") >= 0);
    },

    addClass: function(element, className) {
        if (className.length > 0 && !Cupla.hasClass(element, className)) {
            element.className += ((element.className.length > 0) ? " " : "") + className;
        }
    },

    removeClass: function(element, className) {
        if (className.length > 0 && Cupla.hasClass(element, className)) {
            element.className = (" " + element.className + " ").replace(" " + className + " ", " ").trim();
        }
    },
    
    setData: function(name, value) {
		if (window.localStorage) {
			if (value) {
				window.localStorage.setItem(name, value);
			} else {
				window.localStorage.removeItem(name);
			}
		} else {
			document.cookie = name + "=" + ((value) ? value : "") + ";";
		}
    },
    
    getData: function(name) {
		if (window.localStorage) {
			return window.localStorage.getItem(name);
		} else {
			var cname = name + "=";
			var cookies = document.cookie.split(';');
			for (var i=0; i<cookies.length; i++) {
				var cookie = cookies[i];
				while (cookie.charAt(0) == ' ') {
					cookie = cookie.substring(1);
				}
				if (cookie.indexOf(cname) == 0) {
					return cookie.substring(cname.length, cookie.length);
				}
			}
		}
		return null;
    },
};

//--- ---
