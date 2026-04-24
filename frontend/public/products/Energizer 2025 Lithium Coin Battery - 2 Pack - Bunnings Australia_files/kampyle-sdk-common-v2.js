/* eslint wrap-iife: "off", func-names: "off", vars-on-top: "off",
  "no-use-before-define": "off", "radix": "off", "no-unused-vars": "off", "max-len": "off",
  "semi-spacing": "off", "no-multi-spaces": "off", "no-nested-ternary": "off", "no-undef": "off"
*/
var KAMPYLE_COMMON = (function(window, document) {
	function loadForm(formId) {
		return KAMPYLE_ONSITE_SDK.loadForm(formId);
	}

	function showForm(formId, options) {
		return KAMPYLE_ONSITE_SDK.showForm(formId, options);
	}

	function closeForm(formId) {
		KAMPYLE_EVENT_DISPATCHER.trigger('neb_formClosed', { formId: formId });
	}

	function formatCustomParams(customParams) {
		customParams = customParams || {};
		var customParamsArray = [];
		for (var prop in customParams) {
			if (customParams.hasOwnProperty(prop)) {
				customParamsArray.push({unique_name: prop, value: customParams[prop]});
			}
		}
		return customParamsArray;
	}

	return {
		loadForm: loadForm,
		showForm: showForm,
		closeForm: closeForm,
		formatCustomParams: formatCustomParams
	};

})(window, document);

/* eslint wrap-iife: "off", func-names: "off", "no-console": "off",
  "no-undef": "off", "no-unused-vars": "off", "vars-on-top": "off"
*/
var KAMPYLE_UTILS = {
  isIos: function() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  },
  triggerCustomEvent: function(eventName, data) {
    data = data || {};
    // create and dispatch the event
    var event = new CustomEvent(eventName, data);
    window.dispatchEvent(event);
  },
  createFormUrl: function(url, formId) {

    url += '?formId=' + formId;
    url += '&type=live';

    // Because document.referrer doesnt allow seeing the #,
    // we need to send it to the iframe
    // TODO - send the site's url via message event
    var fullUrl = window.location.href;
    var splitted = fullUrl.split('?');
    if (splitted && splitted.length)
    {
      fullUrl = splitted[0];
    }
    url += '&referrer=' + encodeURIComponent(fullUrl);

    var region = KAMPYLE_DATA.getMemoryData('region');
    if (region) {
      url += '&region=' + region;
    }

    if (KAMPYLE_DATA.isFeatureEnabled('WCAG')) {
      url += '&isWCAG=true';
    }

    return url;
  },
  isDebugMode: function() {
    var region = KAMPYLE_DATA.getMemoryData('region');
    return (region === 'dev' || region === 'qa');
  },
  showErrorStack: function(e) {
    if (KAMPYLE_UTILS.isDebugMode()) {
      console.warn(e.stack);
    }
  },
  showWarning: function(message) {
    if (KAMPYLE_UTILS.isDebugMode()) {
      console.warn(message);
    }
  },
  addStyle: function(cssStyle, referencedDocument) {
    referencedDocument = referencedDocument || window.document;
    var style = referencedDocument.getElementById('kampyleStyle');
    if (style === null) {
      style = referencedDocument.createElement('style');
      style.type = 'text/css';
      style.id = 'kampyleStyle';
      var head = referencedDocument.head || referencedDocument.getElementsByTagName('head')[0];
      head.appendChild(style);
    }
    if (style.styleSheet) {
      style.styleSheet.cssText += cssStyle;
    } else {
      style.appendChild(document.createTextNode(cssStyle));
    }
  },
  getViewportSize: function() {
    return {
      width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
      height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
    };
  },
  getDocumentSize: function() {
    var body = document.body;
    var html = document.documentElement;
    var height = Math.max(
      body.scrollHeight || 0,
      body.offsetHeight || 0,
      html.clientHeight || 0,
      html.scrollHeight || 0,
      html.offsetHeight || 0
    );

    var width = Math.max(
      body.scrollWidth || 0,
      html.scrollWidth || 0,
      body.offsetWidth || 0,
      html.offsetWidth || 0,
      html.clientWidth || 0
    );
    return {
      width: width + (body.getBoundingClientRect ? body.getBoundingClientRect().left || 0 : 0),
      height: height + (body.getBoundingClientRect ? body.getBoundingClientRect().top || 0 : 0),
    };
  },
  getTimeDiff: function (time, format) {
    var datetime = typeof time !== 'undefined' ? time : '2014-01-01 01:02:03.123456';
    datetime = new Date(datetime).getTime();
    var now = Date.now();

    if (isNaN(datetime)) {
      return '';
    }
    var miliSecDiff = 0;

    if (datetime < now) {
      miliSecDiff = now - datetime;
    } else {
      miliSecDiff = datetime - now;
    }

    switch (format) {
      case KAMPYLE_CONSTANT.TIME_FORMATS.SECONDS:
        return miliSecDiff.toFixed(1) / 1000;
      case KAMPYLE_CONSTANT.TIME_FORMATS.DAYS:
        return Math.floor(miliSecDiff / 1000 / 60 / 60 / 24); // millis in seconds / secons in minutes / minutes in hours / hours in days;
      default:
        return miliSecDiff;
    }
  },
  /*getDaysDiff: function (time) {
    time = Number(time) || Date.now();
    var secondsDiff = Math.floor(KAMPYLE_UTILS.getTimeDiff(time, 'seconds'));
    return Math.floor(secondsDiff / 60 / 60 / 24);
  },*/
  setEventHandler: function (elem, eventType, handler) {
    if (elem.addEventListener) {
      elem.addEventListener(eventType, handler, false);
    }
    else if (elem.attachEvent) {
      elem.attachEvent('on' + eventType, handler);
    }
  },
	removeEventHandler: function (elem, eventType, handler) {
		if (elem.removeEventListener) {
			elem.removeEventListener(eventType, handler);
		} else if (elem.detachEvent) {
			elem.detachEvent('on' + eventType, handler);
		}
	},
  setElementStyle: function(element, styleObj, isImportant) {
    var k;
    var dashed;
    isImportant = !!isImportant ? 'important' : '';
    if (element) {
      for (k in styleObj) {
          if (styleObj.hasOwnProperty(k)) {
            if (isImportant && element && element.style.setProperty) {
              //Need to convert camel case to dash case for this api
              dashed = KAMPYLE_UTILS.camelToDash(k);
              try {
                element.style.setProperty(dashed, '' + styleObj[k], isImportant);
              }
              catch (e) {
                element.style.setProperty(dashed, '' + styleObj[k], '!' + isImportant);
              }


            }
            else {
              element.style[k] = styleObj[k];
            }


          }
        }
    }

  },
  isNear: function(elementId, distance, event) {
    var element = document.getElementById(elementId);

    if (!element) {
      return false;
    }

    var left = KAMPYLE_UTILS.offset(element).left - distance;
    var top = KAMPYLE_UTILS.offset(element).top - distance;
    var right = left + element.clientWidth + (2 * distance);
    var bottom = top + element.clientHeight + (2 * distance);
    var x = event.pageX;
    var y = event.pageY;

    return (x > left && x < right && y > top && y < bottom);

  },
  offset: function(element) {
    if (!element) { return false; }

    var rect = element.getBoundingClientRect();

    var bodyElm = document.body;
    return {
      top: + rect.top + bodyElm.scrollTop,
      left: rect.left + bodyElm.scrollLeft,
    };
  },
  createIframe: function(src, width, height, iframeId) {
    var iframe = document.createElement('iframe');
    iframe.width = width;
    iframe.height = height;
    iframe.src = src;
    iframe.id = iframeId;
    iframe.style.border = 0;
    iframe.frameBorder = 0;
    iframe.style.display = 'inline-block';

    return iframe;
  },
  getUrlParam: function(name) {
    var params = location.search.substr(location.search.indexOf('?') + 1);
    //if no params from search, check maybe it is after hash
    if (params === '') {
      params = location.hash.substr(location.hash.indexOf('?') + 1);
    }
    var sval = '';
    params = params.split('&');
    var paramLenght = params.length;
      // split param and value into individual pieces
      for (var i = 0; i < paramLenght; i++)
     {
       var temp = params[i].split('=');
       /* jshint -W116 */
       if (temp && [temp[0]] == name) { sval = temp[1]; }
       /* jshint +W116 */
     }
    return sval;
  },
  htmlDecode: function(inputHtml) {
    inputHtml = inputHtml || '';
    var re;
    re = new RegExp('&lt', 'g');
    inputHtml = inputHtml.replace(re, '<');
    re = new RegExp('&gt', 'g');
    inputHtml = inputHtml.replace(re, '>');

    return inputHtml;
  },
  escapeRegExp: function(str) {
      return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, '\\$1');
  },
  replaceAll: function (str, find, replace) {
    return str.replace(new RegExp(KAMPYLE_UTILS.escapeRegExp(find), 'g'), replace);
  },
  sendMessageToIframe: function(iframeId, message) {
    var origin;
    var targetWindow;
    var iframe;

    if (!iframeId) { return; }

    iframe = document.getElementById(iframeId);

    if (!iframe || !iframe.getAttribute) {return;}

    var origin = iframe.getAttribute('origin') || '*';
    var targetWindow = iframe.contentWindow;

    if (targetWindow && targetWindow.postMessage)
    {
      targetWindow.postMessage(JSON.stringify(message), origin);
    }
  },
  getBrowser: function() {
    var ua = navigator.userAgent, tem,
    M = ua.match(/(opera|chrome|safari|firefox|msie|trident(?=\/))\/?\s*(\d+)/i) || [];
    if (/trident/i.test(M[1])) {
      tem = /\brv[ :]+(\d+)/g.exec(ua) || [];
      return {
        name: 'IE',
        version: tem[1] || '',
      };
    }
    if (M[1] === 'Chrome') {
      tem = ua.match(/\b(OPR|Edge)\/(\d+)/);
      if (tem != null) {
        var temArr = tem.slice(1);
        return {
          name: temArr[0].replace('OPR', 'Opera'),
          version: temArr[1] || '',
        };
      }
    }
    M = M[2] ? [M[1], M[2]] : [navigator.appName, navigator.appVersion, '-?'];
    if ((tem = ua.match(/version\/(\d+)/i)) != null) M.splice(1, 1, tem[1]);
    return {
      name: M[0],
      version: M[1],
    };
  },
  initEventSubscriptions: function(eventObj, callback) {
    for (var prop in eventObj)
    {
      if (eventObj.hasOwnProperty(prop))
      {
        KAMPYLE_EVENT_DISPATCHER.subscribe(prop, callback);
      }
    }

  },
  kampyleGetUserId: function() {
    //first check if userid exist in storage
    var userid = KAMPYLE_DATA.getData('kampyle_userid');
    if (!userid) {
      userid = KAMPYLE_UTILS.kampyleCreateUUID();
      KAMPYLE_DATA.setData('kampyle_userid', userid);
    }
    return userid;
  },
  kampyleCreateUUID: function() {
    var numAttempts = 8;
    var uuidAlgorithm = function() {
      return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
    };
    var uuid = uuidAlgorithm();

    for (var i = 0; i < numAttempts - 1; i++) {
      uuid += '-' + uuidAlgorithm();
    }

    return uuid;
  },
  removeAllContent: function (elem) {
    if (!elem) {return;}
    while (elem.firstChild) {
      elem.removeChild(elem.firstChild);
    }
    elem.parentNode.removeChild(elem);
  },
  safeToLower: function(toLower) {
    if (typeof toLower !== 'string')
    {
      return toLower;
    }
    else {
      return toLower.toLowerCase();
    }
  },
  // Set cookie
  kampyleSetCookie: function (cookieName, cookieValue, exDays) {
    var currDate = new Date();
    currDate.setTime(currDate.getTime() + (exDays * 24 * 60 * 60 * 1000));
    var expires = 'expires=' + currDate.toUTCString();
    document.cookie = cookieName + '=' + cookieValue + '; ' + expires + ';path=/';
  },
  // get cookie - ONLY USE THIS
  getCookie: function (cookieName) {
    this.name = cookieName + '=';
    this.ca = document.cookie.split(';');
    for (var i = 0; i < this.ca.length; i++) {
      this.c = this.ca[i];
      while (this.c.charAt(0) === ' ') this.c = this.c.substring(1);
      if (this.c.indexOf(this.name) === 0) {
      	var valueToReturn = this.c.substring(this.name.length, this.c.length);
      	return valueToReturn;
			}
    }

    return null;
  },

  // get cookie by name
  kampyleGetCookie: function (cookieName) {
    this.name = cookieName + '=';
    this.ca = document.cookie.split(';');
    for (var i = 0; i < this.ca.length; i++) {
      this.c = this.ca[i];
      while (this.c.charAt(0) === ' ') this.c = this.c.substring(1);
      if (this.c.indexOf(this.name) === 0) return this.c.substring(this.name.length, this.c.length);
    }

    return '';
  },

  getByteSize: function(s) {
    return encodeURIComponent('<q></q>' + s).length;
  },
  getAllKampyleData: function() {
    //TODO - Set all names as const variable
    var kampyleDataNames = [
      'SUBMITTED_DATE',
      'kampyleUserPercentile',
      'kampyleUserSession',
      'kampyle_userid',
      'kampyleInvitePresented',
      'DECLINED_DATE',
      'LAST_INVITATION_VIEW',
    ];

    var result = {};

    for (var i = kampyleDataNames.length - 1; i >= 0; i--) {
      result[kampyleDataNames[i]] = KAMPYLE_DATA.getData(kampyleDataNames[i]);
    }

    return result;
  },
  kampyleDeleteCookie: function(cookieName) {
    var expires = 'expires=Thu, 01 Jan 1970 00:00:00 UTC';
    document.cookie = cookieName + '= ; ' + expires + '; path=/';
  },
  kampyleIsCookieEnabled: function() {
    return navigator.cookieEnabled;
  },
  kampyleCompareTimestamps: function(source, toCompare, operator)
  {
    if (typeof source !== 'number' || typeof toCompare !== 'number')
    {
      return false;
    }

    //Get only the date from the time
    source = new Date(source);
    toCompare = new Date(toCompare);
    source.setHours(0, 0, 0, 0);


    switch (operator) {
      case 'equals':
        toCompare.setHours(0, 0, 0, 0);
        return (source.getTime() === toCompare.getTime());
        break;
      case 'laterthan':
        toCompare.setHours(23, 59, 59, 999);

        return (source > toCompare);
        break;
      case 'earlierthan':
        toCompare.setHours(0, 0, 0, 0);

        return (source < toCompare);
        break;
      case 'doesnotequal':
        toCompare.setHours(0, 0, 0, 0);
        return (source.getTime() !== toCompare.getTime());
        break;
      default:
        return false;
        break;
    }
  },
  /**
   * @param  {[type]} source  the param value
   * @param  {[type]} toCompare the compared to value
   * @param  {[type]} operator    'equals' etc
   */
  kampyleCompareByOperator: function(source, toCompare, operator, varType) {
    varType = KAMPYLE_UTILS.safeToLower(varType);
    var ans = false;
    if (source === undefined)
    {
      return ans;
    }

    operator = KAMPYLE_UTILS.safeToLower(operator);
    switch (operator) {
      case 'equals':
        if (varType === 'datetime') //Need to extract the date from the timstamp
        {
          ans = KAMPYLE_UTILS.kampyleCompareTimestamps(source, toCompare, operator);
        }
        else {
          ans = (source === toCompare);
        }

        break;
      case 'doesnotequal':
        if (varType === 'datetime') //Need to extract the date from the timstamp
        {
          ans = KAMPYLE_UTILS.kampyleCompareTimestamps(source, toCompare, operator);
        }
        else {
          ans = (source !== toCompare);
        }
        break;

        break;
      case 'greaterthan':
        ans = (source > toCompare);
        break;
      case 'laterthan':
        if (varType === 'datetime') //Need to extract the date from the timstamp
        {
          ans = KAMPYLE_UTILS.kampyleCompareTimestamps(source, toCompare, operator);
        }
        else {
          ans = (source > toCompare);
        }
        break;
      case 'smallerthan':
        ans = (source < toCompare);
        break;
      case 'earlierthan':
        if (varType === 'datetime') //Need to extract the date from the timstamp
        {
          ans = KAMPYLE_UTILS.kampyleCompareTimestamps(source, toCompare, operator);
        }
        else {
          ans = (source > toCompare);
        }
        break;
      case 'contains':
        ans = (!!source && source.indexOf && source.indexOf(toCompare) !== -1);
        break;
      case 'doesnotcontain':
        ans = (!!source && source.indexOf && source.indexOf(toCompare) === -1);
        break;
      case 'startswith':
        ans = (!!source && source.indexOf && source.indexOf(toCompare) === 0);
        break;
      case 'endswith':
        ans = (!!source && source.indexOf &&
            source.length &&
            source.indexOf(toCompare, source.length - source.length) !== -1);
        break;
      case 'hasvalue':
        //Simply check that first value exists
        ans = (!!source || source === '' || source === false || source === 0);
        break;

      default:
        break;
    }
    return ans;
  },
  setNestedPropertyValue: function(obj, propString, value) {
    var schema = obj;  // a moving reference to internal objects within obj
    var pList = propString.split('.');
    var len = pList.length;
    for (var i = 0; i < len - 1; i++) {
      var elem = pList[i];
      if (!schema[elem]) {
        schema[elem] = {};
      }
      schema = schema[elem];
    }
    schema[pList[len - 1]] = value;
  },
  getNestedPropertyValue: function(obj, propString) {
    if (!obj || !propString) {return null;}
    var props = propString.split('.');
    var tmpObj = obj;

    var len = props.length;
    for (var i = 0; i < len; i++) {
      if (!!tmpObj && (tmpObj.hasOwnProperty(props[i]) || tmpObj[props[i]]))
      {
        tmpObj = tmpObj[props[i]];
      }
      else {
        return null;
      }
    }

    //Reaching here means we managed to go into the object with all of propString's properties
    return tmpObj;
  },
  //function to match kampyle cdn hosts url (if cdn host name changes we'll have to update here)
  validateKampyleDomain: function(url) {
    var urlRegex = /(^https?:\/\/[A-Za-z0-9\-]+\.kampyle\.com(\/[A-Za-z0-9\-\._~:\/\?#\[\]@!$&'\(\)\*\+,;\=]*)?)/;
    var result = urlRegex.test(url);
    if (!result) {
      console.warn('Invalid url in validateKampyleDomain: ' + url);
    }

    return result;
  },
  camelToDash: function(str) {
    if (typeof str !== 'string') {
      return str;
    }
    else {
      return str.replace(/\W+/g, '-')
                .replace(/([a-z\d])([A-Z])/g, '$1-$2')
                .toLowerCase();
    }

  },

  objectPropertyObserver: function (obj, pathToProperty, callback) {

    var MAX_TIMEOUT_RUNS = 100;
    var timeoutMs = 100;
    var runsCounter = 0;

    function timoutCallback () {
      var propertyValue = KAMPYLE_UTILS.getNestedPropertyValue(obj, pathToProperty);

      if (!!propertyValue && callback instanceof Function) {
        return callback(propertyValue);
      }

      if (runsCounter++ < MAX_TIMEOUT_RUNS) {
        window.setTimeout(timoutCallback, timeoutMs);
      }
    }

    window.setTimeout(timoutCallback, timeoutMs);
  },
	showInvite: function () {
		var inviteIframe = document.getElementById('kampyleInvite');
		KAMPYLE_UTILS.setElementStyle(inviteIframe, { visibility: 'visible' }, true /* important */);
	},
	hideInvite: function () {
		var inviteIframe = document.getElementById('kampyleInvite');
		KAMPYLE_UTILS.setElementStyle(inviteIframe, { visibility: 'hidden' }, true /* important */);

	},
  getNumericValue: function(val) {

    if (val === '' || val === null) {
      return null;
    }
    if (typeof(val) !== 'number' && isNaN(Number(val))) {
      return null;
    }

    return Number(val);
  },
   httpGetRequest: function(url, numOfTimes, timeout, callback) {
    var counter = 0;
    function makeRequest() {
        KAMPYLE_EVENT_DISPATCHER.trigger('neb_beforeHttpGetRequest');
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.timeout = timeout || 0;
        xhr.onerror = function () {
            KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpGetRequestOnError');
            if (typeof callback === 'function') {
                callback();
            } else {
                return;
            }
        };
        xhr.ontimeout = function () {
            if (counter < numOfTimes) {
                counter++;
                makeRequest();
            } else {
                KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpGetRequestOnTimeout');
                if (typeof callback === 'function') {
                    callback();
                } else {
                    return;
                }
            }
        };
        xhr.onload = function() {
            var getRequestData = {};
            if (xhr.status === 200) {
               var data = JSON.parse(xhr.responseText);
               KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpGetRequest', { dataFromNode: Object.assign({}, data)});
               if (typeof callback === 'function') {
                   callback(null, data);
               } else {
                 return;
               }
            }
            else {
              if (counter < numOfTimes) {
                  counter++;
                  makeRequest();
              } else {
                KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpGetRequest', { dataFromNode: xhr.status});
                if (typeof callback === 'function') {
                    callback(xhr.status);
                } else {
                  return;
                }
              }

            }
        };
        xhr.send();
    }

    makeRequest();

   },

   httpPostRequest: function(url, jsonData, callback) {
       var postRequestData = {
         postData: Object.assign({}, jsonData),
       };
       KAMPYLE_EVENT_DISPATCHER.trigger('neb_beforeHttpPostRequest', postRequestData);
       var xhr = new XMLHttpRequest();
       xhr.open('POST', url);
       xhr.setRequestHeader('Content-Type', 'application/json');
       xhr.onerror = function () {
           KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpPostRequestOnError', { postData: xhr.status});
           if (typeof callback === 'function') {
               callback();
           } else {
               return;
           }
       }
       xhr.onload = function() {
           if (xhr.status === 200) {
             KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpPostRequest', postRequestData);
             if (typeof callback === 'function') {
                 callback(null, data);
             } else {
               return;
             }
           }
           else {
             KAMPYLE_EVENT_DISPATCHER.trigger('neb_afterHttpPostRequest', { postData: xhr.status});
             if (typeof callback === 'function') {
                 callback(xhr.status);
             } else {
               return;
             }
           }
       };
       xhr.send(JSON.stringify(jsonData));
   },

   lowerize : function (str) {
    return str.toLowerCase();
   },
  
   trim : function (str) {
    return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '');
   },

   getDeviceTypeByUserAgent: function (agent) {
    var FUNC_TYPE   = 'function',
      MODEL       = 'model',
      OBJ_TYPE    = 'object',
      TYPE        = 'type',
      VENDOR      = 'vendor',
      CONSOLE     = 'console',
      MOBILE      = 'mobile',
      TABLET      = 'tablet',
      SMARTTV     = 'smarttv',
      WEARABLE    = 'wearable',
      DESKTOP     = 'desktop';
    var device = {};
  
    var arrays = [
      [
        /\((ipad|playbook);[\w\s\);-]+(rim|apple)/i                         // iPad/PlayBook
      ], [MODEL, VENDOR, [TYPE, TABLET]], [
  
        /applecoremedia\/[\w\.]+ \((ipad)/                                  // iPad
      ], [MODEL, [VENDOR, 'Apple'], [TYPE, TABLET]],[
  
        /(archos)\s(gamepad2?)/i,                                           // Archos
        /(hp).+(touchpad)/i,                                                // HP TouchPad
        /(hp).+(tablet)/i,                                                  // HP Tablet
        /(kindle)\/([\w\.]+)/i,                                             // Kindle
        /\s(nook)[\w\s]+build\/(\w+)/i,                                     // Nook
        /(dell)\s(strea[kpr\s\d]*[\dko])/i,                                   // Dell Streak
        /SHIELD Tablet/,
        /A500/,
        /LG-V410\/V41020c/,                                                 //LG
        /Puffin/,                                                            // Puffin browser
        /^(?!.*Mobile).*Android.*$/
      ], [VENDOR, MODEL, [TYPE, TABLET]], [
  
        /(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i                               // Kindle Fire HD
      ], [MODEL, [VENDOR, 'Amazon'], [TYPE, TABLET]], /*[ //TODO: CHECK THIS
       /(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i                  // Fire Phone
       ], [[MODEL, mapper.str, maps.device.amazon.model], [VENDOR, 'Amazon'], [TYPE, MOBILE]], */ [
  
        /\((ip[honed|\s\w*]+);.+(apple)/i                                   // iPod/iPhone
      ], [MODEL, VENDOR, [TYPE, MOBILE]], [
        /\((ip[honed|\s\w*]+);/i                                            // iPod/iPhone
      ], [MODEL, [VENDOR, 'Apple'], [TYPE, MOBILE]], [
  
        /(blackberry)[\s-]?(\w+)/i,                                         // BlackBerry
        /(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,
        // BenQ/Palm/Sony-Ericsson/Acer/Asus/Dell/Huawei/Meizu/Motorola/Polytron
        /(hp)\s([\w\s]+\w)/i,                                               // HP iPAQ
        /(asus)-?(\w+)/i                                                    // Asus
      ], [VENDOR, MODEL, [TYPE, MOBILE]],
      [
        /\(bb10;\s(\w+)/i                                                   // BlackBerry 10
      ], [MODEL, [VENDOR, 'BlackBerry'], [TYPE, MOBILE]], [
        // Asus Tablets
        /android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7|padfone)/i
      ], [MODEL, [VENDOR, 'Asus'], [TYPE, TABLET]],
      [
        /(sony)\s(tablet\s[ps])\sbuild\//i,                                  // Sony
        /(sony)?(?:sgp.+)\sbuild\//i
      ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Tablet'], [TYPE, TABLET]], [
        /(?:sony)?(?:(?:(?:c|d)\d{4})|(?:so[-l].+))\sbuild\//i
      ], [[VENDOR, 'Sony'], [MODEL, 'Xperia Phone'], [TYPE, MOBILE]],
      [
        /(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i                         // Lenovo tablets
      ], [VENDOR, MODEL, [TYPE, TABLET]], [
  
        /(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,                               // HTC
        /(zte)-(\w+)*/i,                                                    // ZTE
        /(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i
        // Alcatel/GeeksPhone/Huawei/Lenovo/Nexian/Panasonic/Sony
      ], [VENDOR, [MODEL, /_/g, ' '], [TYPE, MOBILE]], [
  
        /(nexus\s9)/i                                                       // HTC Nexus 9
      ], [MODEL, [VENDOR, 'HTC'], [TYPE, TABLET]], [
  
        /(nexus\s6p)/i                                                      // Huawei Nexus 6P
      ], [MODEL, [VENDOR, 'Huawei'], [TYPE, MOBILE]],
      [
        /(microsoft);\s(lumia[\s\w]+)/i                                     // Microsoft Lumia
      ], [VENDOR, MODEL, [TYPE, MOBILE]],
      [
        /(kin\.[onetw]{3})/i                                                // Microsoft Kin
      ], [[MODEL, /\./g, ' '], [VENDOR, 'Microsoft'], [TYPE, MOBILE]],
      [
        // Motorola
        /\s(milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?)[\w\s]+build\//i,
        /mot[\s-]?(\w+)*/i,
        /(XT\d{3,4}) build\//i,
        /(nexus\s6)/i
      ], [MODEL, [VENDOR, 'Motorola'], [TYPE, MOBILE]], [
        /android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i
      ], [MODEL, [VENDOR, 'Motorola'], [TYPE, TABLET]],
      [
        /android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n\d+|sgh-t8[56]9|nexus 10))/i,
        /((SM-T\w+))/i
      ], [[VENDOR, 'Samsung'], MODEL, [TYPE, TABLET]], [                  // Samsung
        /smart-tv.+(samsung)/i
      ], [VENDOR, [TYPE, SMARTTV], MODEL], [
        /((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-\w[\w\d]+))/i,
        /(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,
        /sec-((sgh\w+))/i
      ], [[VENDOR, 'Samsung'], MODEL, [TYPE, MOBILE]], [
        /sie-(\w+)*/i                                                       // Siemens
      ], [MODEL, [VENDOR, 'Siemens'], [TYPE, MOBILE]], [
  
        /(maemo|nokia).*(n900|lumia\s\d+)/i,                                // Nokia
        /(nokia)[\s_-]?([\w-]+)*/i
      ], [[VENDOR, 'Nokia'], MODEL, [TYPE, MOBILE]], [
  
        /android\s3\.[\s\w;-]{10}(a\d{3})/i                                 // Acer
      ], [MODEL, [VENDOR, 'Acer'], [TYPE, TABLET]], [
  
        /android\s3\.[\s\w;-]{10}(lg?)-([06cv9]{3,4})/i                     // LG Tablet
      ], [[VENDOR, 'LG'], MODEL, [TYPE, TABLET]],
      [
        /(nexus\s[45])/i,                                                   // LG
        /lg[e;\s\/-]+(\w+)*/i
      ], [MODEL, [VENDOR, 'LG'], [TYPE, MOBILE]], [
  
        /android.+(ideatab[a-z0-9\-\s]+)/i                                  // Lenovo
      ], [MODEL, [VENDOR, 'Lenovo'], [TYPE, TABLET]], [
  
        /linux;.+((jolla));/i                                               // Jolla
      ], [VENDOR, MODEL, [TYPE, MOBILE]],
      [
        /android.+;\s(oppo)\s?([\w\s]+)\sbuild/i                            // OPPO
      ], [VENDOR, MODEL, [TYPE, MOBILE]],
      [
        /android.+;\s(pixel c)\s/i                                          // Google Pixel C
      ], [MODEL, [VENDOR, 'Google'], [TYPE, TABLET]], [
  
        /android.+;\s(pixel xl|pixel)\s/i                                   // Google Pixel
      ], [MODEL, [VENDOR, 'Google'], [TYPE, MOBILE]], [
  
        /android.+(\w+)\s+build\/hm\1/i,                                    // Xiaomi Hongmi 'numeric' models
        /android.+(hm[\s\-_]*note?[\s_]*(?:\d\w)?)\s+build/i,               // Xiaomi Hongmi
        /android.+(mi[\s\-_]*(?:one|one[\s_]plus|note lte)?[\s_]*(?:\d\w)?)\s+build/i    // Xiaomi Mi
      ], [[MODEL, /_/g, ' '], [VENDOR, 'Xiaomi'], [TYPE, MOBILE]], [
  
        /android.+a000(1)\s+build/i                                         // OnePlus
      ], [MODEL, [VENDOR, 'OnePlus'], [TYPE, MOBILE]],
      [
        /\s(tablet)[;\/]/i,                                                 // Unidentifiable Tablet
        /\s(mobile)(?:[;\/]|\ssafari)/i                                     // Unidentifiable Mobile
      ], [[TYPE, KAMPYLE_UTILS.lowerize], VENDOR, MODEL],
      [
        /Mobile|iP(hone|od|ad)|(Android).*(Mobile|sdk)|BlackBerry|portalmmm|BOLT|Vodafone|WindowsCE|IEMobile|Kindle|NetFront|Silk-Accelerated|(hpw|web)OS|Fennec|Minimo|Opera M(obi|ini)|Blazer|Dolfin|Dolphin|Skyfire|Zune/
      ], [VENDOR, MODEL, [TYPE, MOBILE]],
    ];
    var ua = agent || navigator.userAgent;
  
    //var result = {},
    var i = 0, j, k, p, q, matches, match;//, args = arguments;
    // loop through all regexes maps
    while (i < arrays.length && !matches) {
  
      var regex = arrays[i],       // even sequence (0,2,4,..)
        props = arrays[i + 1];   // odd sequence (1,3,5,..)
      j = k = 0;
  
      // try matching uastring with regexes
      while (j < regex.length && !matches) {
        matches = regex[j++].exec(ua);
  
        if (!!matches) {
          for (p = 0; p < props.length; p++) {
            match = matches[++k];
            q = props[p];
            // check if given property is actually array
            if (typeof q === OBJ_TYPE && q.length > 0) {
              if (q.length == 2) {
                if (typeof q[1] == FUNC_TYPE) {
                  // assign modified match
                  device[q[0]] = q[1].call(device, match);
                } else {
                  // assign given value, ignore regex match
                  device[q[0]] = q[1];
                }
              } else if (q.length == 3) {
                // check whether function or regex
                if (typeof q[1] === FUNC_TYPE && !(q[1].exec && q[1].test)) {
                  // call function (usually string mapper)
                  device[q[0]] = match ? q[1].call(device, match, q[2]) : undefined;
                } else {
                  // sanitize match using given regex
                  device[q[0]] = match ? match.replace(q[1], q[2]) : undefined;
                }
              } else if (q.length == 4) {
                device[q[0]] = match ? q[3].call(device, match.replace(q[1], q[2])) : undefined;
              }
            } else {
              device[q] = match ? match : undefined;
            }
          }
        }
      }
      i += 2;
    }
  
    //We only care for mobile, desktop and tablet, hence treat all other types as desktop
    if (!device[TYPE] || (device[TYPE] !== MOBILE && device[TYPE] !== TABLET)) {
      return DESKTOP;
    }
    return device[TYPE];
  },
};

var KAMPYLE_EVENT_DISPATCHER = (function(window,document) {

  var eventSubscriptions;

  function init() {
    eventSubscriptions = {};
  }

  var getEventSubscriptions = function(eventName) {
    if (eventName && eventSubscriptions[eventName]) {
      return eventSubscriptions[eventName];
    }
    else {
      return eventSubscriptions;
    }

  };

  var unsubscribe = function(eventName, callback) {
    if (!eventName || typeof eventName !== 'string' ||
        !callback || typeof callback !== 'function' ) {
      return false;
    }

    // Retrieve a list of current subscribers for eventName (if any)
    var subscribers = eventSubscriptions[eventName];

    if (typeof subscribers !== 'undefined') {
      // Add the given callback function to the end of the array with
      // eventSubscriptions for this event.
      var callbackIndex = subscribers.indexOf(callback);
      if (callbackIndex !== -1)
      {
        subscribers.splice(callbackIndex,1);
      }
    }

    return true;

  };

  var subscribe = function(eventName, callback) {
    if (!eventName || typeof eventName !== 'string' ||
        !callback || (typeof callback !== 'function' && typeof callback !== 'string') ) {
      return false;
    }

    // Retrieve a list of current subscribers for eventName (if any)
    var subscribers = eventSubscriptions[eventName];

    if (typeof subscribers === 'undefined') {
      // If no subscribers for this event were found,
      // initialize a new empty array
      subscribers = eventSubscriptions[eventName] = [];
    }

    // Add the given callback function to the end of the array with
    // eventSubscriptions for this event.
    var callbackIndex = subscribers.indexOf(callback);
    if (callbackIndex === -1) //Meaning doesn't exist already
    {
      subscribers.push(callback);
    }

    return true;
  };

  function appendDefaultEventParams(data) {
    data = data || {};
    var allData = KAMPYLE_FUNC.kampyleGetData();
    var defaultValues = {};
    if (allData) {
      defaultValues = {
        'accountId': allData.accountId,
        'websiteId':allData.websiteId,
        'enviroment':allData.region
      };
    }

    return Object.assign(data,defaultValues);
  }

  var trigger = function(eventName, data, context, options) {
    var subscribers = eventSubscriptions[eventName];
    var i, iMax;

    if (typeof subscribers === 'undefined') {
      // No list found for this event, return early to abort execution
      return false;
    }

    data = appendDefaultEventParams(data);


    // Ensure data is an array or is wrapped in an array,
    // for Function.prototype.apply use
    data = (data instanceof Array) ? data : [data];

    // Set a default value for `this` in the callback
    context = context || null;
    iMax = subscribers.length;
    for (i = 0;  i < iMax; i += 1) {
      if (typeof subscribers[i] === 'string') {
        KAMPYLE_UTILS.triggerCustomEvent(subscribers[i]);
      }
      else {
        try {
            subscribers[i].apply(context, [eventName].concat(data));
        }catch(e){
            console.warn(e);
            // If we are in strict mode, errors should break the callback flow
            if (options && options.isStrictMode) {
                break;
            }
            continue;
        }
      }
    }

    return true;
  };

  var subscribeMany = function(eventMapping) {
    for (var eventName in eventMapping) {
      if (eventMapping.hasOwnProperty(eventName)) {
        for (var i = 0; i < eventMapping[eventName].length; i++) {
          subscribe(eventName,eventMapping[eventName][i]);
        }
      }
    }
  };


  function subscribeOnce(eventName, callback) {
    var subscribers = getEventSubscriptions(eventName);

    if (subscribers.indexOf(callback) === -1) {
      subscribe(eventName, callback);
    }
  }


  //public API
  return {
    subscribe: subscribe,
    subscribeOnce: subscribeOnce,
    subscribeMany: subscribeMany,
    trigger: trigger,
    unsubscribe: unsubscribe,
    init: init,

    //for testing
    getEventSubscriptions: getEventSubscriptions,
    appendDefaultEventParams: appendDefaultEventParams
  }
})(window, document);

/* eslint wrap-iife: "off", func-names: "off", vars-on-top: "off",
  "no-use-before-define": "off", "radix": "off", "no-unused-vars": "off", "max-len": "off",
  "semi-spacing": "off", "no-multi-spaces": "off", "no-nested-ternary": "off"
*/

/******** THIS SECTION IS FOR Polyfill FUNCTION WE NEED ********/
var KAMPYLE_POLYFILLS = (function(window, document) {
  // Production steps of ECMA-262, Edition 5, 15.4.4.14
  // Reference: http://es5.github.io/#x15.4.4.14

	// https://tc39.github.io/ecma262/#sec-array.prototype.includes
	if (!Array.prototype.includes) {
		Object.defineProperty(Array.prototype, 'includes', {
			value: function(searchElement, fromIndex) {

				// 1. Let O be ? ToObject(this value).
				if (this == null) {
					throw new TypeError('"this" is null or not defined');
				}

				var o = Object(this);

				// 2. Let len be ? ToLength(? Get(O, "length")).
				var len = o.length >>> 0;

				// 3. If len is 0, return false.
				if (len === 0) {
					return false;
				}

				// 4. Let n be ? ToInteger(fromIndex).
				//    (If fromIndex is undefined, this step produces the value 0.)
				var n = fromIndex | 0;

				// 5. If n ≥ 0, then
				//  a. Let k be n.
				// 6. Else n < 0,
				//  a. Let k be len + n.
				//  b. If k < 0, let k be 0.
				var k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

				function sameValueZero(x, y) {
					return x === y || (typeof x === 'number' && typeof y === 'number' && isNaN(x) && isNaN(y));
				}

				// 7. Repeat, while k < len
				while (k < len) {
					// a. Let elementK be the result of ? Get(O, ! ToString(k)).
					// b. If SameValueZero(searchElement, elementK) is true, return true.
					// c. Increase k by 1.
					if (sameValueZero(o[k], searchElement)) {
						return true;
					}
					k++;
				}

				// 8. Return false
				return false;
			},
		});
	}

    // String includes polyphill
  if (!String.prototype.includes) {
    String.prototype.includes = function(search, start) {
      'use strict';
      if (typeof start !== 'number') {
        start = 0;
      }

      if (start + search.length > this.length) {
        return false;
      } else {
        return this.indexOf(search, start) !== -1;
      }
    };
  }

  // https://tc39.github.io/ecma262/#sec-array.prototype.find
  if (!Array.prototype.find) {
    Object.defineProperty(Array.prototype, 'find', {
      value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];

        // 5. Let k be 0.
        var k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return kValue.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return kValue;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return undefined.
        return undefined;
      },
    });
  }

  if (!Array.prototype.indexOf) {
    Array.prototype.indexOf = function(searchElement, fromIndex) {

      var k;
      if (this == null) {
        throw new TypeError('"this" is null or not defined');
      }

      var o = Object(this);
      var len = o.length >>> 0;
      if (len === 0) {
        return -1;
      }
      var n = +fromIndex || 0;

      if (Math.abs(n) === Infinity) {
        n = 0;
      }
      if (n >= len) {
        return -1;
      }
      k = Math.max(n >= 0 ? n : len - Math.abs(n), 0);

      while (k < len) {
        if (k in o && o[k] === searchElement) {
          return k;
        }
        k++;
      }
      return -1;
    };
  }

  if (!Array.prototype.filter) {
    Array.prototype.filter = function(fun/*, thisArg*/) {
      'use strict';

      if (this === void 0 || this === null) {
        throw new TypeError();
      }

      var t = Object(this);
      var len = t.length >>> 0;
      if (typeof fun !== 'function') {
        throw new TypeError();
      }

      var res = [];
      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      for (var i = 0; i < len; i++) {
        if (i in t) {
          var val = t[i];

          // NOTE: Technically this should Object.defineProperty at
          //       the next index, as push can be affected by
          //       properties on Object.prototype and Array.prototype.
          //       But that method's new, and collisions should be
          //       rare, so use the more-compatible alternative.
          if (fun.call(thisArg, val, i, t)) {
            res.push(val);
          }
        }
      }

      return res;
    };
  }

  if (!Array.prototype.forEach) {

    Array.prototype.forEach = function(callback/*, thisArg*/) {

      var T, k;

      if (this == null) {
        throw new TypeError('this is null or not defined');
      }

      // 1. Let O be the result of calling toObject() passing the
      // |this| value as the argument.
      var O = Object(this);

      // 2. Let lenValue be the result of calling the Get() internal
      // method of O with the argument "length".
      // 3. Let len be toUint32(lenValue).
      var len = O.length >>> 0;

      // 4. If isCallable(callback) is false, throw a TypeError exception.
      // See: http://es5.github.com/#x9.11
      if (typeof callback !== 'function') {
        throw new TypeError(callback + ' is not a function');
      }

      // 5. If thisArg was supplied, let T be thisArg; else let
      // T be undefined.
      if (arguments.length > 1) {
        T = arguments[1];
      }

      // 6. Let k be 0
      k = 0;

      // 7. Repeat, while k < len
      while (k < len) {

        var kValue;

        // a. Let Pk be ToString(k).
        //    This is implicit for LHS operands of the in operator
        // b. Let kPresent be the result of calling the HasProperty
        //    internal method of O with argument Pk.
        //    This step can be combined with c
        // c. If kPresent is true, then
        if (k in O) {

          // i. Let kValue be the result of calling the Get internal
          // method of O with argument Pk.
          kValue = O[k];

          // ii. Call the Call internal method of callback with T as
          // the this value and argument list containing kValue, k, and O.
          callback.call(T, kValue, k, O);
        }
        // d. Increase k by 1.
        k++;
      }
      // 8. return undefined
    };
  }

  //Date.now
  if (!Date.now) {
    Date.now = function now() {
      return new Date().getTime();
    };
  }

  // Object Assign
  if (typeof Object.assign != 'function') {
    (function () {
      Object.assign = function (target) {
        'use strict';
        if (target === undefined || target === null) {
          throw new TypeError('Cannot convert undefined or null to object');
        }

        var output = Object(target);
        for (var index = 1; index < arguments.length; index++) {
          var source = arguments[index];
          if (source !== undefined && source !== null) {
            for (var nextKey in source) {
              if (source.hasOwnProperty(nextKey)) {
                output[nextKey] = source[nextKey];
              }
            }
          }
        }
        return output;
      };
    })();
  }

  // Production steps of ECMA-262, Edition 5, 15.4.4.17
  // Reference: http://es5.github.io/#x15.4.4.17
  if (!Array.prototype.some) {
    Array.prototype.some = function(fun/*, thisArg*/) {
      'use strict';

      if (this == null) {
        throw new TypeError('Array.prototype.some called on null or undefined');
      }

      if (typeof fun !== 'function') {
        throw new TypeError();
      }

      var t = Object(this);
      var len = t.length >>> 0;

      var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
      for (var i = 0; i < len; i++) {
        if (i in t && fun.call(thisArg, t[i], i, t)) {
          return true;
        }
      }

      return false;
    };
  }

  // https://tc39.github.io/ecma262/#sec-array.prototype.findIndex
  if (!Array.prototype.findIndex) {
    Object.defineProperty(Array.prototype, 'findIndex', {
      value: function(predicate) {
      // 1. Let O be ? ToObject(this value).
        if (this == null) {
          throw new TypeError('"this" is null or not defined');
        }

        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0;

        // 3. If IsCallable(predicate) is false, throw a TypeError exception.
        if (typeof predicate !== 'function') {
          throw new TypeError('predicate must be a function');
        }

        // 4. If thisArg was supplied, let T be thisArg; else let T be undefined.
        var thisArg = arguments[1];

        // 5. Let k be 0.
        var k = 0;

        // 6. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kValue be ? Get(O, Pk).
          // c. Let testResult be ToBoolean(? Call(predicate, T, « kValue, k, O »)).
          // d. If testResult is true, return k.
          var kValue = o[k];
          if (predicate.call(thisArg, kValue, k, o)) {
            return k;
          }
          // e. Increase k by 1.
          k++;
        }

        // 7. Return -1.
        return -1;
      },
    });
  }

  if (!Array.prototype.every) {
      Array.prototype.every = function(callbackfn, thisArg) {
          'use strict';
          var T, k;

          if (this == null) {
              throw new TypeError('this is null or not defined');
          }

          // 1. Let O be the result of calling ToObject passing the this
          //    value as the argument.
          var O = Object(this);

          // 2. Let lenValue be the result of calling the Get internal method
          //    of O with the argument "length".
          // 3. Let len be ToUint32(lenValue).
          var len = O.length >>> 0;

          // 4. If IsCallable(callbackfn) is false, throw a TypeError exception.
          if (typeof callbackfn !== 'function') {
              throw new TypeError();
          }

          // 5. If thisArg was supplied, let T be thisArg; else let T be undefined.
          if (arguments.length > 1) {
              T = thisArg;
          }

          // 6. Let k be 0.
          k = 0;

          // 7. Repeat, while k < len
          while (k < len) {

              var kValue;

              // a. Let Pk be ToString(k).
              //   This is implicit for LHS operands of the in operator
              // b. Let kPresent be the result of calling the HasProperty internal
              //    method of O with argument Pk.
              //   This step can be combined with c
              // c. If kPresent is true, then
              if (k in O) {

                  // i. Let kValue be the result of calling the Get internal method
                  //    of O with argument Pk.
                  kValue = O[k];

                  // ii. Let testResult be the result of calling the Call internal method
                  //     of callbackfn with T as the this value and argument list
                  //     containing kValue, k, and O.
                  var testResult = callbackfn.call(T, kValue, k, O);

                  // iii. If ToBoolean(testResult) is false, return false.
                  if (!testResult) {
                      return false;
                  }
              }
              k++;
          }
          return true;
      };
  }

  // Production steps of ECMA-262, Edition 5, 15.4.4.21
  // Reference: http://es5.github.io/#x15.4.4.21
  // https://tc39.github.io/ecma262/#sec-array.prototype.reduce
  if (!Array.prototype.reduce) {
    Object.defineProperty(Array.prototype, 'reduce', {
      value: function(callback /*, initialValue*/) {
        if (this === null) {
          throw new TypeError( 'Array.prototype.reduce ' + 
            'called on null or undefined' );
        }
        if (typeof callback !== 'function') {
          throw new TypeError( callback +
            ' is not a function');
        }

        // 1. Let O be ? ToObject(this value).
        var o = Object(this);

        // 2. Let len be ? ToLength(? Get(O, "length")).
        var len = o.length >>> 0; 

        // Steps 3, 4, 5, 6, 7      
        var k = 0; 
        var value;

        if (arguments.length >= 2) {
          value = arguments[1];
        } else {
          while (k < len && !(k in o)) {
            k++; 
          }

          // 3. If len is 0 and initialValue is not present,
          //    throw a TypeError exception.
          if (k >= len) {
            throw new TypeError( 'Reduce of empty array ' +
              'with no initial value' );
          }
          value = o[k++];
        }

        // 8. Repeat, while k < len
        while (k < len) {
          // a. Let Pk be ! ToString(k).
          // b. Let kPresent be ? HasProperty(O, Pk).
          // c. If kPresent is true, then
          //    i.  Let kValue be ? Get(O, Pk).
          //    ii. Let accumulator be ? Call(
          //          callbackfn, undefined,
          //          « accumulator, kValue, k, O »).
          if (k in o) {
            value = callback(value, o[k], k, o);
          }

          // d. Increase k by 1.      
          k++;
        }

        // 9. Return accumulator.
        return value;
      }
    });
  }

  //Custom Event
  (function () {

    if (typeof window.CustomEvent === 'function') return false;

    function CustomEvent (event, params) {
      params = params || { bubbles: false, cancelable: false, detail: undefined };
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail);
      return evt;
     }

    CustomEvent.prototype = window.Event.prototype;

    window.CustomEvent = CustomEvent;
  })();
})(window, document);

/******** THIS SECTION IS FOR Polyfill FUNCTION WE NEED ********/

"use strict";
(function (window) {
    'use strict';
    window.digServices = window.digServices || {};
    window.digServices.androidInterface = function (utils, eventDispatcher, common) {
        var sdkObjFunctionsMapping = {
            formFeedbackData: 'sendFeedbackToMobileSdk',
            formSubmitted: 'submitSuccess',
            formClose: 'close',
            formSubmitPending: 'submitPending',
            formSubmitPendingShouldCloseFalse: 'formSubmitPendingShouldCloseFalse',
            formLoaded: 'sendExtraDataToForm',
            formReady: 'ready',
        };
        var liveFormData = {
            triggerType: null,
            customParams: null,
        };
        function handleFormEvents(event, data) {
            var eventSdkName = sdkObjFunctionsMapping[event];
            if (!eventSdkName) {
                return false;
            }
            invokeMobileSDKFunction(eventSdkName, data);
        }
        function invokeMobileSDKFunction(funcName, data) {
            var submitPendingShouldNotClose = false;
            if (funcName === 'formSubmitPendingShouldCloseFalse') {
                funcName = 'submitPending';
                submitPendingShouldNotClose = true;
            }
            if (window.NebulaAndroid && window.NebulaAndroid[funcName]) {
                console.info("Calling method window.NebulaAndroid: " + funcName);
                switch (funcName) {
                    case 'ready':
                    case 'getDeviceData':
                    case 'getProvisions':
                    case 'getSecretToken':
                    case 'getCustomParams':
                    case 'submitSuccess':
                    case 'close':
                        return window.NebulaAndroid[funcName]();
                    case 'submitPending':
                        return submitPendingShouldNotClose ? window.NebulaAndroid[funcName](false) : window.NebulaAndroid[funcName]();
                    case 'sendFeedbackToMobileSdk':
                        return window.NebulaAndroid[funcName](JSON.stringify(data));
                    default:
                        console.warn('No method found ot invoke' + funcName);
                }
            }
            else {
                console.warn('Problem with invoking ' + funcName);
            }
        }
        function sendExtraDataToForm() {
            var formData = getFormData();
            eventDispatcher.trigger('extraDataArrived', formData);
        }
        function getFormData() {
            var deviceData = utils.safeJsonParse(invokeMobileSDKFunction('getDeviceData', null));
            var provisions = utils.safeJsonParse(invokeMobileSDKFunction('getProvisions', null));
            var secretToken = invokeMobileSDKFunction('getSecretToken', null);
            var dataObj = {
                deviceData: deviceData,
                provisions: provisions,
                secretToken: secretToken,
            };
            return dataObj;
        }
        function sendCustomParamsToForm() {
            var parsedCustomParams = utils.safeJsonParse(invokeMobileSDKFunction('getCustomParams', null));
            var customParamsToSend = common.formatCustomParams(parsedCustomParams);
            eventDispatcher.trigger('customParamsLoaded', customParamsToSend);
        }
        function handleFormShown(data) {
            var parsedCustomParams = utils.safeJsonParse(invokeMobileSDKFunction('getCustomParams', null));
            var customParamsToSend = common.formatCustomParams(parsedCustomParams);
            liveFormData.triggerType = data.triggerType || KAMPYLE_TRIGGER_TYPES.CODE;
            liveFormData.customParams = customParamsToSend || {};
            //TODO : unite into single function in live-form.controller
            eventDispatcher.trigger('customParamsLoaded', liveFormData);
        }
        function initNebulaFormObj() {
            window.NebulaForm = window.NebulaForm || {};
            window.NebulaForm.show = handleFormShown;
        }
        function init() {
            initNebulaFormObj();
            //Listen to messages from live form
            var eventMapping = {
                formLoaded: [sendExtraDataToForm],
                requestCustomParams: [sendCustomParamsToForm],
                formReady: [handleFormEvents],
                formSubmitted: [handleFormEvents],
                formFeedbackData: [handleFormEvents],
                formClose: [handleFormEvents],
                formSubmitPending: [handleFormEvents],
                formSubmitPendingShouldCloseFalse: [handleFormEvents],
            };
            eventDispatcher.subscribeMany(eventMapping);
        }
        return {
            init: init,
            //For testing
            invokeMobileSDKFunction: invokeMobileSDKFunction,
            getFormData: getFormData,
        };
    };
})(window);

"use strict";
(function (window) {
    'use strict';
    window.digServices = window.digServices || {};
    window.digServices.iosInterface = function (utils, eventDispatcher, common) {
        var iosFormData = {
            deviceData: null,
            provisions: null,
            secretToken: null,
        };
        var liveFormData = {
            triggerType: null,
            customParams: null,
        };
        var sdkObjFunctionsMapping = {
            formFeedbackData: 'webkit.messageHandlers.sendFeedbackToMobileSdk.postMessage',
            formSubmitted: 'webkit.messageHandlers.submitSuccess.postMessage',
            formClose: 'webkit.messageHandlers.close.postMessage',
            formSubmitPending: 'webkit.messageHandlers.submitPending.postMessage',
            formSubmitPendingShouldCloseFalse: 'webkit.messageHandlers.submitPending.postMessage',
            formReady: 'webkit.messageHandlers.ready.postMessage',
        };
        function invokeMobileSDKFunction(funcName, data) {
            var functionToCall = utils.getNestedProperty(window, sdkObjFunctionsMapping[funcName]);
            if (typeof functionToCall === 'function') {
                try {
                    switch (funcName) {
                        case 'formReady':
                            if (utils.getNestedProperty(window, 'webkit.messageHandlers.ready.postMessage')) {
                                window.webkit.messageHandlers.ready.postMessage('');
                            }
                            break;
                        case 'formSubmitPending':
                            if (utils.getNestedProperty(window, 'webkit.messageHandlers.submitPending.postMessage')) {
                                window.webkit.messageHandlers.submitPending.postMessage(true);
                            }
                            break;
                        case 'formSubmitPendingShouldCloseFalse':
                            if (utils.getNestedProperty(window, 'webkit.messageHandlers.submitPending.postMessage')) {
                                window.webkit.messageHandlers.submitPending.postMessage(false);
                            }
                            break;
                        case 'formClose':
                            if (utils.getNestedProperty(window, 'webkit.messageHandlers.close.postMessage')) {
                                window.webkit.messageHandlers.close.postMessage('');
                            }
                            break;
                        case 'formSubmitted':
                            if (utils.getNestedProperty(window, 'webkit.messageHandlers.submitSuccess.postMessage')) {
                                window.webkit.messageHandlers.submitSuccess.postMessage('');
                            }
                            break;
                        case 'formFeedbackData':
                            if (utils.getNestedProperty(window, 'webkit.messageHandlers.sendFeedbackToMobileSdk.postMessage')) {
                                window.webkit.messageHandlers.sendFeedbackToMobileSdk.postMessage(JSON.stringify(data));
                            }
                            break;
                        default:
                            // code...
                            break;
                    }
                }
                catch (e) {
                    console.warn("IOS: (in catch) Problem with invoking " + funcName + " :  " + functionToCall + ", error: " + e);
                }
            }
            else {
                console.warn("Problem with invoking " + funcName + " : " + functionToCall);
            }
        }
        function getInitialData(eventName) {
            if (utils.getNestedProperty(window, 'webkit.messageHandlers.getSecretToken.postMessage')) {
                window.webkit.messageHandlers.getSecretToken.postMessage('');
            }
            if (utils.getNestedProperty(window, 'webkit.messageHandlers.getDeviceData.postMessage')) {
                window.webkit.messageHandlers.getDeviceData.postMessage('');
            }
            if (utils.getNestedProperty(window, 'webkit.messageHandlers.getProvisions.postMessage')) {
                window.webkit.messageHandlers.getProvisions.postMessage('');
            }
        }
        function callSdkReady() {
            invokeMobileSDKFunction('formReady', null);
        }
        function getCustomParams() {
            if (utils.getNestedProperty(window, 'webkit.messageHandlers.getCustomParams.postMessage')) {
                window.webkit.messageHandlers.getCustomParams.postMessage('');
            }
        }
        function isDataComplete(dataObj) {
            for (var dataProp in dataObj) {
                if (!dataObj[dataProp]) {
                    return false;
                }
            }
            eventDispatcher.trigger('extraDataArrived', dataObj);
            return true;
        }
        function initNebulaFormObj() {
            window.NebulaForm = window.NebulaForm || {};
            window.NebulaForm.setSecretToken = function (secretToken) {
                if (secretToken === void 0) { secretToken = null; }
                iosFormData.secretToken = secretToken;
                isDataComplete(iosFormData);
            };
            window.NebulaForm.setDeviceData = function (deviceData) {
                iosFormData.deviceData = utils.safeJsonParse(deviceData) || null;
                isDataComplete(iosFormData);
            };
            window.NebulaForm.setProvisions = function (provisions) {
                iosFormData.provisions = utils.safeJsonParse(provisions) || null;
                isDataComplete(iosFormData);
            };
            window.NebulaForm.setCustomParams = function (customParams) {
                var formatedCustomParams = common.formatCustomParams(utils.safeJsonParse(customParams))
                    || null;
                liveFormData.customParams = formatedCustomParams;
                eventDispatcher.trigger('customParamsLoaded', liveFormData);
            };
            window.NebulaForm.show = function (data) {
                data = utils.safeJsonParse(data) || {};
                liveFormData.triggerType = data.triggerType || KAMPYLE_TRIGGER_TYPES.CODE;
                if (utils.getNestedProperty(window, 'webkit.messageHandlers.getCustomParams.postMessage')) {
                    window.webkit.messageHandlers.getCustomParams.postMessage('');
                }
            };
        }
        function init() {
            initNebulaFormObj();
            //Listen to messages from live form
            var eventMapping = {
                formFeedbackData: [invokeMobileSDKFunction],
                formSubmitted: [invokeMobileSDKFunction],
                formClose: [invokeMobileSDKFunction],
                formLoaded: [getInitialData],
                formReady: [callSdkReady],
                requestCustomParams: [getCustomParams],
                formSubmitPending: [invokeMobileSDKFunction],
                formSubmitPendingShouldCloseFalse: [invokeMobileSDKFunction],
            };
            eventDispatcher.subscribeMany(eventMapping);
        }
        return {
            init: init,
            //For testing
            invokeMobileSDKFunction: invokeMobileSDKFunction,
            initNebulaFormObj: initNebulaFormObj,
            isDataComplete: isDataComplete,
            callSdkReady: callSdkReady,
        };
    };
})(window);

"use strict";
(function (window) {
    'use strict';
    window.digServices = window.digServices || {};
    window.digServices.webInterface = function (utils, eventDispatcher) {
        var basicData;
        function addAdditionalPayloadToMessage(eventName, data) {
            basicData = Object.assign(basicData, data);
        }
        function sendMessageToGeneric(messageData) {
            if (window.opener) { //if opened as a popup
                window.opener.postMessage(JSON.stringify(messageData), '*');
            }
            else if (window.parent !== window.top) { // Meaning the embed.js was opened in an iframe
                window.parent.postMessage(JSON.stringify(messageData), '*');
            }
            else if (window.top !== window.self) { // Meaning the form was opened in an iframe (always...)
                top.window.postMessage(JSON.stringify(messageData), '*');
            }
            else {
                window.postMessage(JSON.stringify(messageData), '*');
            }
        }
        function sendMessage(action, extraData) {
            var dataObj = Object.assign({}, basicData);
            Object.assign(dataObj, { action: action });
            for (var prop in extraData) {
                if (extraData.hasOwnProperty(prop)) {
                    dataObj[prop] = extraData[prop];
                }
            }
            if (!!document.referrer || !!utils.getUrlParam('referrer', window.location.href)) {
                sendMessageToGeneric(dataObj);
            }
        }
        function handleGenericMessage(event) {
            if (!utils.getNestedProperty(event, 'data')) {
                return false;
            }
            var parsedData;
            try {
                parsedData = JSON.parse(event.data);
            }
            catch (e) {
                parsedData = {};
            }
            switch (parsedData.action) {
                case 'setExtraData':
                    eventDispatcher.trigger('extraDataArrived', parsedData);
                    break;
                case 'setFocus':
                    eventDispatcher.trigger('setFocus');
                    break;
                case 'takenScreenCapture':
                    eventDispatcher.trigger('screenCaptureTaken', parsedData);
                    break;
                case 'cancelScreenCapture':
                    eventDispatcher.trigger('screenCaptureCanceled', parsedData);
                    break;
                case 'customParamsLoaded':
                    eventDispatcher.trigger('customParamsLoaded', parsedData);
                    break;
                case 'setFormId':
                    break;
                case 'screenCaptureLoaded':
                    eventDispatcher.trigger('screenCaptureLoaded', parsedData);
                    break;
                case 'setFormStyle':
                    eventDispatcher.trigger('setFormStyle', parsedData);
                    break;
                default:
                    console.warn("Unknown action: \"" + parsedData.action + "\"");
                    break;
            }
        }
        function init() {
            basicData = {};
            //Listen to messages from generic and trigger events from the ED
            window.addEventListener('message', handleGenericMessage, false);
            //Listen to messages from live form (app.ts)
            var eventMapping = {
                setInterfaceData: [addAdditionalPayloadToMessage],
                SendMessageToGeneric: [sendMessage],
                formPageShown: [addAdditionalPayloadToMessage, sendMessage],
                formSubmitted: [addAdditionalPayloadToMessage, sendMessage],
                triggerScreenCapture: [sendMessage],
                screenCaptureDelete: [sendMessage],
                screenCaptureRetake: [sendMessage],
                formClose: [sendMessage],
                formLoaded: [sendMessage],
                formSubmitPending: [sendMessage],
                iFrameHeightChanged: [sendMessage],
                scrollToTop: [sendMessage],
                scrollFromTop: [sendMessage],
                feedbackUUIDisNull: [sendMessage],
                submitFeedbackFailed: [sendMessage],
                MDigital_Form_Next_Page: [sendMessage],
                MDigital_Form_Back_Page: [sendMessage],
                MDigital_Form_Close_No_Submit: [sendMessage],
                MDigital_ThankYou_Displayed: [sendMessage],
                MDigital_ThankYou_Close: [sendMessage],
                MDigital_Form_Close_Submitted: [sendMessage]
            };
            eventDispatcher.subscribeMany(eventMapping);
        }
        return {
            init: init,
            //For testing
            handleGenericMessage: handleGenericMessage,
        };
    };
})(window);


/* eslint  "no-undef": "off", "no-console": "off"*/
var KAMPYLE_TRIGGER_TYPES = {
	CODE: 'code',
	LIVE: 'live',
};

var KAMPYLE_SDK = (function(window, document) {
	var scCallback;

	var CONST = {
		STORAGE_ITEMS: [
			'isFormClosed', 'formId', 'uuid', 'integrations', 'context', 'triggerType',
			'customParams', 'urlPath', 'isSubmitStarted', 'isScreenCaptureEnabled', 'device',
			'provisions',
		],
		TRIGGER_TYPES: {
			LIVE: 'live',
			PREVIEW: 'Preview',
		},
		MOBILE_VERSIONS: {
			MOBILE_SEND_FEEDBACK_MIN_VERSION: 2.14,
		},
		PROVISIONS: {
			EVENT_INCLUDE_FEEDBACK_CONTENT: 'eventIncludeFeedbackContent',
			SEPARATE_FORM_TEMPLATE_FROM_DATA: 'separateFormTemplateFromData',
			BACKEND_GENERATED_UUID: '20dcr4_MPC2802_enable_backendGeneratedUUID',
			WCAG_COMPATIBLE_POWERED_BY_LOGO: '21dcr1_mpc3281_alignWCAGLogoMarkup',
			FORM_TEMPLATES_WCAG: 'formTemplatesWCAG'
		},
		ALLOWED_COMPONENT_TYPES_AS_EVENT_PAYLOAD: {
			nps: true,
			grading: true,
			grading0to10: true,
			grading1to10: true,
			grading1to7: true
		},
    CUSTOM_EVENTS: {
			SUBMIT_FEEDBACK_FAILED: 'submitFeedbackFailed',
			FEEDBACK_UUID_IS_NULL: 'feedbackUUIDisNull',
      FORM_CLOSE_SUBMIT: 'MDigital_Form_Close_Submitted',
      FORM_CLOSE_NO_SUBMIT: 'MDigital_Form_Close_No_Submit'
    }
	};

	var MEMORY = (function() {
		var _memory = {};

		function set(dataName, dataValue) {
			_memory[dataName] = dataValue;
		}

		function get(dataName) {
			return _memory[dataName];
		}

		function clear() {
			_memory = {};
		}

		function getAll() {
			return _memory;
		}

		return {
			get: get,
			getAll: getAll,
			set: set,
			clear: clear,
		};
	})();

	var utils = {
		camelToDash: function(str) {
			if (typeof str !== 'string') {
				return str;
			} else {
				return str.replace(/\W+/g, '-')
					.replace(/([a-z\d])([A-Z])/g, '$1-$2')
					.toLowerCase();
			}
		},
		getNestedProperty: function(obj, propString) {
			if (!obj || !propString) {return null;}
			var props = propString.split('.');
			var tmpObj = obj;

			var len = props.length;
			for (var i = 0; i < len; i++) {
				if (!!tmpObj && (tmpObj.hasOwnProperty(props[i]) || tmpObj[props[i]]))
				{
					tmpObj = tmpObj[props[i]];
				}
				else {
					return null;
				}
			}

			//Reaching here means we managed to go into the object with all of propString's properties
			return tmpObj;
		},
		triggerCustomEvent: function(eventName, data) {
			data = data || {};
			// create and dispatch the event

			var event;
			try {
				event = new CustomEvent(eventName, data);
			}
			catch (e) {
				event = document.createEvent('CustomEvent');

				// event.initCustomEvent(type, canBubble, cancelable, detail);
				event.initCustomEvent(eventName, true, true, data);
			}
			window.dispatchEvent(event);
		},
		getViewportSize: function() {
			return {
				width: Math.max(document.documentElement.clientWidth, window.innerWidth || 0),
				height: Math.max(document.documentElement.clientHeight, window.innerHeight || 0),
			};
		},
		getDocumentSize: function() {
			var body = document.body;
			var html = document.documentElement;
			var height = Math.max(
				body.scrollHeight || 0,
				html.scrollHeight || 0,
				body.offsetHeight || 0,
				html.offsetHeight || 0,
				html.clientHeight || 0
			);

			var width = Math.max(
				body.scrollWidth || 0,
				html.scrollWidth || 0,
				body.offsetWidth || 0,
				html.offsetWidth || 0,
				html.clientWidth || 0
			);
			return {
				width: width + (body.getBoundingClientRect ? body.getBoundingClientRect().left || 0 : 0),
				height: height + (body.getBoundingClientRect ? body.getBoundingClientRect().top || 0 : 0),
			};
		},
		setElementStyle: function(element, styleObj, isImportant) {
			var k;
			var dashed;
			isImportant = !!isImportant ? 'important' : '';
			if (element) {
				for (k in styleObj) {
					if (styleObj.hasOwnProperty(k)) {
						if (isImportant && element && element.style.setProperty) {
							//Need to convert camel case to dash case for this api
							dashed = KAMPYLE_UTILS.camelToDash(k);
							try {
								element.style.setProperty(dashed, '' + styleObj[k], isImportant);
							}
							catch (e) {
								element.style.setProperty(dashed, '' + styleObj[k], '!' + isImportant);
							}
						}
						else {
							element.style[k] = styleObj[k];
						}
					}
				}
			}
		},
		generateUuid: function() {
			function uuidAlgorithm() {
				return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1);
			}

			var numAttempts = 8;
			var uuid = uuidAlgorithm();
			for (var i = 0; i < numAttempts - 1; i++) {
				uuid += '-' + uuidAlgorithm();
			}

			return uuid;
		},
		clearData: function() {
			var currItem;
			for (var i = CONST.STORAGE_ITEMS.length - 1; i >= 0; i--) {
				currItem = CONST.STORAGE_ITEMS[i];
				KAMPYLE_SDK.utils.setData(currItem, null);
			}

			KAMPYLE_SDK.MEMORY.clear();
		},
		hasValue: function(data) {
			return data !== undefined && data !== null && data !== 'null';
		},
		getData: function(dataName) {
			var data = KAMPYLE_SDK.MEMORY.get(dataName);
			if (!KAMPYLE_SDK.utils.hasValue(data)) {
				try {
					data = sessionStorage.getItem(dataName);
				}
				catch (e) { //fallback to cookies and memory
					data = KAMPYLE_SDK.utils.getCookie(dataName);
				}
			}

			if (KAMPYLE_SDK.utils.hasValue(data)) {
				//Check if it is an object
				var parsed = this.safeJsonParse(data);
				if (!!parsed || parsed === 0 || parsed === false) {
					return parsed;
				} else {
					return data;
				}
			}
			return null;
		},
		setCookie: function (cookieName, cookieValue, exDays) {
			exDays = exDays || 365;
			var currDate = new Date();
			currDate.setTime(currDate.getTime() + (exDays * 24 * 60 * 60 * 1000));
			var expires = 'expires=' + currDate.toUTCString();
			document.cookie = cookieName + '=' + cookieValue + '; ' + expires + ';path=/';
		},
		getCookie: function (cookieName) {
			this.name = cookieName + '=';
			this.ca = document.cookie.split(';');
			for (var i = 0; i < this.ca.length; i++) {
				this.c = this.ca[i];
				while (this.c.charAt(0) === ' ') this.c = this.c.substring(1);
				if (this.c.indexOf(this.name) === 0) return this.c.substring(this.name.length, this.c.length);
			}

			return '';
		},

		setData: function(dataName, dataValue) {
			if (typeof dataValue === 'object' && !!dataValue) { //to avoid null
				dataValue = this.safeJsonStringify(dataValue);
			}

			KAMPYLE_SDK.MEMORY.set(dataName, dataValue);
			// refactor is required
			// this persistant implemtation is problematic due to the fact that
			// the values can be overriden by values of other chtml forms
			try	{
				sessionStorage.setItem(dataName, dataValue);
			}
			catch (e) { //fallback to cookies
				KAMPYLE_SDK.utils.setCookie(dataName, dataValue);
			}
		},

		sendMessage: function(action, extraData) {
			var baseData = {
				action: action,
				formId: utils.getData('formId')
			};

			var uuid = utils.getData('uuid');
			if (kampyleCheckProvision(CONST.PROVISIONS.BACKEND_GENERATED_UUID)) {
				baseData.feedbackCorrelationUUID = uuid;
			} else {
				baseData.uuid = uuid;
			}

			Object.assign(baseData, extraData);

			KAMPYLE_EVENT_DISPATCHER.trigger('SendMessageToGeneric', baseData);
		},
		/**
		 * Overcomes IE8 issues with event subscription
		 * @param  eventType - name of the event
		 * @param  handler   - triggered function
		 */
		kampyleEventHandler: function (elem, eventType, handler) {
			if (elem.addEventListener) {
				elem.addEventListener(eventType, handler, false);
			}
			else if (elem.attachEvent) {
				elem.attachEvent('on' + eventType, handler);
			}
		},
		/**
		 * Overcomes IE8 issues with event subscription
		 * @param  eventType - name of the event
		 * @param  handler   - triggered function
		 */
		kampyleRemoveEventHandler: function (elem, eventType, handler) {
			if (elem.removeEventListener) {
				elem.removeEventListener(eventType, handler, false);
			}
			else if (elem.detachEvent) {
				elem.detachEvent('on' + eventType, handler);
			} else {
				elem['on' + eventType] = null;
			}
		},
		/**
		 * Helper function for fetching URL-passed params
		 * @param  {string]} name- name of the parameter
		 */
		getUrlParam: function(name) {
			/*eslint-disable */
			var params = location.search.substr(location.search.indexOf('?') + 1);
			var sval = '';
			var temp;
			params = params.split('&');
			// split param and value into individual pieces
			for (var i = 0; i < params.length; i++)
			{
				temp = params[i].split('=');
				if (temp && [temp[0]] == name) { sval = temp[1]; }
			}
			return sval;

			/*eslint-enable */
		},
		makeAjaxCall: function(data, url, method, needToCloseFlag) {

			// Create the XHR object.
			var xhr = new XMLHttpRequest();

			if ('withCredentials' in xhr) {
				// XHR for Chrome/Firefox/Opera/Safari.
				xhr.open(method, url, true);
				xhr.setRequestHeader('Content-type', 'application/json');
			}
			else if (typeof XDomainRequest !== 'undefined') {
				// XDomainRequest for IE.
				xhr = new XDomainRequest();
				xhr.open(method, url);
			}
			else {
				// CORS not supported.
				xhr = null;
			}

			if (!xhr) {
				return;
			}

			// Response handlers.
			xhr.onload = function() {
				if (xhr.readyState === xhr.DONE) {
					if (xhr.status == 200) {
						if (kampyleCheckProvision(CONST.PROVISIONS.BACKEND_GENERATED_UUID)) {
							var response = null;
							try {
								response = xhr.responseText && JSON.parse(xhr.responseText);
							} catch (e) {
								// let response to be null when can't parse it
							}
							var feedbackUUID;
							if (response && response.resultObject && response.resultObject.uuid) {
								feedbackUUID = response.resultObject.uuid;
							} else {
								utils.sendMessage(CONST.CUSTOM_EVENTS.FEEDBACK_UUID_IS_NULL);
							}
							utils.sendFormSubmittedMessage(data, {
								feedbackUUID: feedbackUUID
							})
						}
					} else {
						utils.sendMessage(CONST.CUSTOM_EVENTS.SUBMIT_FEEDBACK_FAILED);
					}
					utils.handleFormClosingAfterSubmit(needToCloseFlag);
				} else {
					console.log("submit form result status not ready", xhr.readyState);
				}
			};

			xhr.onerror = function() {
				utils.sendMessage(CONST.CUSTOM_EVENTS.SUBMIT_FEEDBACK_FAILED);
				utils.handleFormClosingAfterSubmit(needToCloseFlag);
			};

			if(typeof(kplConfig) !== "undefined" && kplConfig && kplConfig.mobileVersion === 2) {
                xhr.setRequestHeader('Authorization', 'Bearer_' + data.secretToken);
			}

			//these blank handlers need to be set to fix ie9 http://cypressnorth.com/programming/internet-explorer-aborting-ajax-requests-fixed/
			xhr.onprogress = function () { };
			xhr.ontimeout = function () { };

			//do it, wrapped in timeout to fix ie9
			setTimeout(function () {
				if (data && data.formId && !kampyleCheckProvision(CONST.PROVISIONS.BACKEND_GENERATED_UUID)) {
					utils.sendFormSubmittedMessage(data, {uuid: data.uuid});
				}
				var payload = Object.assign({}, data);
				if (kampyleCheckProvision(CONST.PROVISIONS.BACKEND_GENERATED_UUID)) {
					payload.clientCorrelationId = data.uuid;
				}

				var JSON = KAMPYLE_SDK.utils.initSafeJSON();
				xhr.send(JSON.stringify(payload));
			}, 0);
		},

		handleFormClosingAfterSubmit: function(needToCloseFlag) {
			//User wants to close or hit 'kampyleCloseWindow' before AJAX response
			if (!!needToCloseFlag || !!utils.getData('isFormClosed'))
			{
				// NM-6868 - MDigital_Form_Close_Submitted & MDigital_Form_Close_No_Submit events not fired from custom html
				utils.sendMessage(CONST.CUSTOM_EVENTS.FORM_CLOSE_SUBMIT);
				//
				utils.sendMessage('formClose', { isFormSubmitted : true});
			}
			utils.setData('isSubmitStarted', false);
			utils.setData('isSubmitted', true);
		},

		sendFormSubmittedMessage: function(data, parameters) {
			var eventPayload = {
				formId: data.formId,
				preventClose: true,
			};
			Object.assign(eventPayload, parameters);

			if (kampyleCheckProvision(CONST.PROVISIONS.EVENT_INCLUDE_FEEDBACK_CONTENT)) {
				eventPayload.content = (utils.getNestedProperty(data, 'dynamicData.pages') || [])
					.reduce(function(accumulator, page) { return accumulator.concat(page.components); }, [])
					.filter(function(component) { return CONST.ALLOWED_COMPONENT_TYPES_AS_EVENT_PAYLOAD[component.type]; });
			}
			utils.sendMessage('formSubmitted', eventPayload);
		},

		//TODO - refactor these methods into polyfills
		safeJsonParse: function(stringToParse) {
			if (!stringToParse || (typeof stringToParse === "object")) { return stringToParse; }
			var parsed;
			try {
				var JSON = KAMPYLE_SDK.utils.initSafeJSON();
				parsed = JSON.parse(stringToParse);
			}
			catch (e) {
				parsed = null;
			}

			return parsed;

		},
		safeJsonStringify: function(objectToStringify) {
			var JSON = KAMPYLE_SDK.utils.initSafeJSON();
			return JSON.stringify(objectToStringify);
		},

		/*eslint-disable */
		initSafeJSON: function() {
			if (!!window.JSON) {
				return window.JSON;
			}
			var JSON = window.JSON || {};

			// implement JSON.stringify serialization
			JSON.stringify = JSON.stringify || function (obj) {

					var t = typeof (obj);
					if (t != "object" || obj === null) {

						// simple data type
						if (t == "string") obj = '"'+obj+'"';
						return String(obj);

					}
					else {

						// recurse array or object
						var n, v, json = [], arr = (obj && obj.constructor == Array);

						for (n in obj) {
							v = obj[n]; t = typeof(v);

							if (t == "string") v = '"'+v+'"';
							else if (t == "object" && v !== null) v = JSON.stringify(v);

							json.push((arr ? "" : '"' + n + '":') + String(v));
						}

						return (arr ? "[" : "{") + String(json) + (arr ? "]" : "}");
					}
				};

			// implement JSON.parse de-serialization
			JSON.parse = JSON.parse || function (str) {
					if (str === "") str = '""';
					eval("var p=" + str + ";");
					return p;
				};

			return JSON;
		},
		/*eslint-enable */
		isDebugMode: function() {
			var region = KAMPYLE_SDK.utils.getUrlParam('region');

			return (region === 'dev' || region === 'qa');
		},
		showErrorStack: function(e) {
			if (KAMPYLE_SDK.utils.isDebugMode()) {
				console.warn(e.stack);
			}
		},
		showWarning: function(message) {
			if (KAMPYLE_SDK.utils.isDebugMode()) {
				console.warn(message);
			}
		},
	};

	function initializeCommunicatorByPropertyType() {
		switch ((KAMPYLE_SDK.kampyleGetFormObject() || {}).propertyType) {
			case 'mobileIOS':
				window.digServices.iosInterface(KAMPYLE_SDK.utils, KAMPYLE_EVENT_DISPATCHER, KAMPYLE_COMMON).init();
				// subscribeToMobileEvents();
				break;
			case 'mobileAndroid':
				window.digServices.androidInterface(KAMPYLE_SDK.utils, KAMPYLE_EVENT_DISPATCHER, KAMPYLE_COMMON, window.digServices.webInterface).init();
				// subscribeToMobileEvents();
				break;
			case 'website':
				// KAMPYLE_SDK.utils.kampyleEventHandler(window, 'message', KAMPYLE_SDK.kampyleSetIframeHandler);
				window.digServices.webInterface(KAMPYLE_SDK.utils, KAMPYLE_EVENT_DISPATCHER).init();
				break;
			default:
				// KAMPYLE_SDK.utils.kampyleEventHandler(window, 'message', KAMPYLE_SDK.kampyleSetIframeHandler);
				window.digServices.webInterface(KAMPYLE_SDK.utils, KAMPYLE_EVENT_DISPATCHER).init();
				break;

		}
	}

	function subscribeToInterfaceEvents() {
		KAMPYLE_EVENT_DISPATCHER.subscribe('extraDataArrived', handleExtraDataEvent);
		KAMPYLE_EVENT_DISPATCHER.subscribe('screenCaptureTaken', handleDispatchedEvents);
		KAMPYLE_EVENT_DISPATCHER.subscribe('customParamsLoaded', handleDispatchedEvents);
		KAMPYLE_EVENT_DISPATCHER.subscribe('setFormId', handleDispatchedEvents);
	}


	function kampyleInit() {
		utils.clearData();

		// Initialize modules
		KAMPYLE_EVENT_DISPATCHER.init();

		// Inintialize relevant communicator
		initializeCommunicatorByPropertyType();

		subscribeToInterfaceEvents();

		utils.setData('isSubmitStarted', false);
		utils.setData('isSubmitted', false);
		utils.setData('isFormClosed', false);
		//Get the form id from the onsite generic js
		var formId = utils.getUrlParam('formId') || (KAMPYLE_SDK.kampyleGetFormObject() || {}).id;
		KAMPYLE_EVENT_DISPATCHER.trigger('formReady', { formId: formId });

		if (formId !== undefined && formId !== null)
		{
			utils.setData('formId', formId);
			var sessionVariableFormId = utils.getData('formId');
			if (sessionVariableFormId) {
				//Notify the site the loading has finished in order to send the custom params
				KAMPYLE_EVENT_DISPATCHER.trigger('formLoaded', { formId: sessionVariableFormId });
			}

			//Get the region and map it to a submit url
			var region = utils.getUrlParam('region') || (KAMPYLE_SDK.kampyleGetFormObject() || {}).region;
			if (!region) {
				region = 'us';
			}

			/*eslint-disable */
			var urlPath = KAMPYLE_SDK_URL_HELPER.getUrlFromRegion(region);
			/*eslint-enable */
			if (urlPath) {
				utils.setData('urlPath', urlPath);
			}
		}
		KAMPYLE_SDK.utils.triggerCustomEvent('KampyleSdkLoaded');
	}


	/**
	 * Makes sure the Kampyle is appestylended to the bottom of the customHTML form
	 */
	function addKampyleLogo() {
		//TODO - fix css
		var LOGO_ID = 'kampyleLogoDiv';
		var logoUrl = '//cdn-prod.kampyle.com/resources/form/FormBuilder/assets/images/kampyle/med_logo_medium.png';
		var logoUrlSvg = '//cdn-prod.kampyle.com/resources/form/FormBuilder/assets/images/kampyle/CommandCenterFormLogo.svg';
		var logoDiv = document.createElement('div');
		var propertyType = (KAMPYLE_SDK.kampyleGetFormObject() || {}).propertyType;
		var isWcagCompatibleLogo = kampyleCheckProvision(CONST.PROVISIONS.WCAG_COMPATIBLE_POWERED_BY_LOGO) && kampyleCheckProvision(CONST.PROVISIONS.FORM_TEMPLATES_WCAG) && propertyType === 'website';
		var logoHtml = '';

		if (document.getElementById(LOGO_ID)) {
			return;
		}
		//Style the div
		logoDiv.id = LOGO_ID;

		utils.setElementStyle(logoDiv, {
			position: 'absolute',
			bottom: 5,
			right: 0,
			marginRight: 15,
			paddingBottom: 3,
			fontSize: 12,
			fontWeight: 'normal',
			color: 'rgb(142, 142, 147)',
			zIndex: 9999,
		});

		if (isWcagCompatibleLogo) {
			logoHtml += '<a id="spPoweredByText" target="_blank" style="outline: none; color: inherit; text-decoration: none; font-family:Open Sans, Helvetica, Arial, sans-serif;" href="http://www.medallia.com">';
			logoHtml += 'Powered by';
			logoHtml += '<img src="' + logoUrlSvg + '" alt="Medallia" style="padding-left: 6px;display: inline;height: 14px;vertical-align: text-top; outline: none;border:none;"/>';
			logoHtml += '</a>';
		} else {
			logoHtml += '<span id="spPoweredByText" style="font-family:Helvetica, Arial, sans-serif;">Powered by</span>';
			logoHtml += '<a target="_blank" style="outline: none;" href="http://www.medallia.com"><img src="' + logoUrl + '" alt="kampyle logo not available" style="padding-left: 9px;padding-bottom:3px;display: inline;height: 14px;vertical-align: text-top; outline: none;border:none;"/>';
			logoHtml += '</a>';
		}

		logoDiv.innerHTML = logoHtml;

		document.body.appendChild(logoDiv);
	}

	function handleExtraDataEvent(eventName, data) {
		var integrations;
    data.uuid = data.uuid || KAMPYLE_SDK.utils.generateUuid();
    KAMPYLE_SDK.utils.setData('uuid', data.uuid);

    integrations = utils.getData('integrations');
    if (!!integrations) {
      integrations = utils.safeJsonParse(integrations);
    }
    else {
      integrations = {};
    }

    utils.setData('integrations', data.integrations || {});
    utils.setData('provisions', data.provisions || {});
    utils.setData('isScreenCaptureEnabled', data.isScreenCaptureEnabled);
    utils.setData('triggerType', data.triggerType);
    utils.setData('device', data.device);
    utils.setData('context', data.context);
    utils.setData('referrerUrl', data.url);
		utils.setData('uuid', data.uuid);

		// for mobile
		utils.setData('secretToken', data.secretToken || null);
		utils.setData('mobileDeviceData', data.deviceData || null);

		if (kampyleCheckProvision(CONST.PROVISIONS.SEPARATE_FORM_TEMPLATE_FROM_DATA)) {
			kampyleSetFormObject(data.formData);
		}

		if (kampyleCheckProvision(CONST.PROVISIONS.BACKEND_GENERATED_UUID)) {
			utils.setData('urlPath', data.submitUrlWithBackendUUID);
		} else if (data.submitUrlPrefix && data.submitUrlSuffix) {
			utils.setData('urlPath', data.submitUrlPrefix + data.submitUrlSuffix);
		}

		//Append Kampyle's logo at the bottom of the page
		addKampyleLogo();

    KAMPYLE_SDK.utils.triggerCustomEvent('kampyleFormShown');
    KAMPYLE_SDK.iFrameHeightChanged();
  }

	function handleDispatchedEvents(eventName, data) {
		switch (eventName) {
			case 'customParamsLoaded':
				if (data && data.customParams) {
					KAMPYLE_SDK.utils.setData('customParams', JSON.stringify(data.customParams));
				}
				break;
			case 'setFormId':
				if (!!data && (!!data.formId || data.formId === 0)) {
					KAMPYLE_SDK.utils.setData('formId', data.formId);
				}
				break;
			case 'screenCaptureTaken':
				var integrations = utils.getData('integrations');
				if (!!integrations && !!integrations.screenCapture) {
					integrations.screenCapture.isTaken = true;
					utils.setData('integrations', integrations);
				}
				//Invoke the screen capture callback
				if (!!scCallback && typeof scCallback === 'function') {
					scCallback();
				}
				break;
			default:
				break;
		}
	}

	function isValidSumbitData(submitData) {
		if (!submitData || !submitData.pages || submitData.pages.length === 0 ||
			!KAMPYLE_SDK.utils.getData('formId'))
		{
			utils.showWarning('invalid submit data', submitData);
			return false;
		}
		return true;

	}

	function extractUrl() {
		var context = KAMPYLE_SDK.utils.getData('context') || KAMPYLE_SDK.utils.getUrlParam('type');
		var formattedUrl;
		if (!!context && !!context.toLowerCase && context.toLowerCase() === 'preview') {
			formattedUrl = 'Preview';
		}
		else {
			// Because document.referrer doesnt allow seeing the #,
			// we need to send it to the iframe
			var fullUrl = utils.getUrlParam('referrer') || document.referrer;
			fullUrl = window.decodeURIComponent(fullUrl);

			var splitted = fullUrl.split('?');
			formattedUrl = fullUrl;
			if (splitted && splitted.length)
			{
				formattedUrl = splitted[0];
			}
		}
		return formattedUrl;
	}

	function iFrameHeightChanged(nHeight) {
		utils.sendMessage('iFrameHeightChanged', {
			formId: KAMPYLE_SDK.utils.getData('formId'),
		});
		setTimeout(function() {
			var newHeight = nHeight || KAMPYLE_SDK.utils.getDocumentSize().height;
			utils.sendMessage('iFrameHeightChanged', {
				formId: KAMPYLE_SDK.utils.getData('formId'), newHeight: newHeight,
			});
		});
	}

	function scrollToTop() {
		KAMPYLE_EVENT_DISPATCHER.trigger('scrollToTop', { formId: KAMPYLE_SDK.utils.getData('formId') });
	}

	function extractUrlQueryString() {
		var url = KAMPYLE_SDK.utils.getData('referrerUrl') || document.referrer;
		if (!url) { return undefined; }
		var decodedUrl = window.decodeURIComponent(url);
		return decodedUrl.split('?')[1];
	}

	function kampyleSubmit(data, needToCloseFlag) {
		if (KAMPYLE_SDK.isValidSumbitData(data)) {

			var submitContract = {
				dynamicData: {
					pages: data.pages,
				},
			};

			//Get the form Id
			var formId = KAMPYLE_SDK.utils.getData('formId');
			if (formId) {
				submitContract.formId = Number(formId);
			}

			var triggerType = KAMPYLE_SDK.utils.getData('triggerType') || CONST.TRIGGER_TYPES.LIVE;

			//Get the feedback uuid
			submitContract.uuid = KAMPYLE_SDK.utils.getData('uuid');

			//Get the feedback triggerType
			submitContract.triggerType = KAMPYLE_SDK.utils.getData('triggerType') || 'live';

			//Get all integrations data
			submitContract.integrations = utils.getData('integrations') || {};

			//Custom Params handle
			submitContract.dynamicData.customParams = KAMPYLE_SDK.utils.getData('customParams') || [];

			//append screen resolution
			var screenResolution = window.screen.width + ' X ' + window.screen.height;
			submitContract.fallbackScreenResolution = screenResolution;

			//Append site url according to preview/onsite mode
			submitContract.url = KAMPYLE_SDK.extractUrl();

			//Get the feedback triggerType
			submitContract.triggerType = submitContract.url === 'Preview' ? CONST.TRIGGER_TYPES.PREVIEW : triggerType;

			if (
				KAMPYLE_SDK.utils.getData('mobileDeviceData') &&
				KAMPYLE_SDK.utils.getData('secretToken')
			) {
				submitContract.secretToken = KAMPYLE_SDK.utils.getData('secretToken');
				submitContract.mobileDeviceData = KAMPYLE_SDK.utils.getData('mobileDeviceData');
			}

			//Append url queryString
			var qString = KAMPYLE_SDK.extractUrlQueryString();
			if (qString) { submitContract.urlQueryParams = qString; }

			//Get api url
			var apiUrl = KAMPYLE_SDK.utils.getData('urlPath');
			if (!!apiUrl) {
				utils.setData('isSubmitStarted', true);

				// TODO: remove shouldCloseFalse event - submitPending need to hide the webview and we need to start cooldown preiod from formSubmitted
				var propertyType = (KAMPYLE_SDK.kampyleGetFormObject() || {}).propertyType;
				if(propertyType === 'mobileIOS' || propertyType === 'mobileAndroid'){
					var submitPendingEventSuffix = needToCloseFlag === false ?'ShouldCloseFalse' :'';
					KAMPYLE_EVENT_DISPATCHER.trigger('formSubmitPending' + submitPendingEventSuffix, { formId: utils.getData('formId') });
				}

				var sdkVersion = 0;

				if (submitContract.mobileDeviceData && submitContract.mobileDeviceData.sdkVersion) {
					var version = submitContract.mobileDeviceData.sdkVersion;
					sdkVersion = Number(version.replace(/\.[^.]*?$/, ""));
				}

				if (!submitContract.mobileDeviceData || sdkVersion < CONST.MOBILE_VERSIONS.MOBILE_SEND_FEEDBACK_MIN_VERSION) {
					//Make the API call
					KAMPYLE_SDK.utils.makeAjaxCall(submitContract, apiUrl, 'POST', needToCloseFlag);
				} else {
					KAMPYLE_EVENT_DISPATCHER.trigger('formFeedbackData', submitContract);
					utils.setData('isSubmitStarted', false);
				}
			}

		}
		else {
			return false;
		}

		//prepare contract from html contract ( check that html contract is valide ) (add if needed custom param)
		//ajax call function to backend
		//send close form
	}

	var kampyleCloseWindow = function() {
		utils.setData('isFormClosed', true);

		if (!!utils.getData('isSubmitStarted')) {
			// when submitting is in progress, just hide the form and let form be closed after submit call finishes
			utils.sendMessage('formHide');
		} else {
			// closing form only when submitting is not in progress
			KAMPYLE_EVENT_DISPATCHER.trigger('formClose', { formId: utils.getData('formId') });
			KAMPYLE_SDK.utils.kampyleRemoveEventHandler(window, 'beforeunload', KAMPYLE_SDK.handlePopupClose);
			var isFormSubmitted = utils.getData('isSubmitted');
			var eventName = isFormSubmitted ? CONST.CUSTOM_EVENTS.FORM_CLOSE_SUBMIT : CONST.CUSTOM_EVENTS.FORM_CLOSE_NO_SUBMIT;
			utils.sendMessage(eventName);
			utils.sendMessage('formClose',{ isFormSubmitted : isFormSubmitted});
		}
	};

	function getAllCustomParams() {
		return KAMPYLE_SDK.utils.getData('customParams') || [];
	}

	var kampyleAcceptInvitation = function() {
		var formId = utils.getData('formId');
		utils.sendMessage('inviteAccepted');
	};

	var	kampyleDeclineInvitation = function() {
		var formId = utils.getData('formId');

		utils.sendMessage('inviteDeclined');
	};

	var kampyleFormPageDisplayed = function(pageNumber) {
		var formId = utils.getData('formId');
		var uuid = utils.getData('uuid');

		KAMPYLE_EVENT_DISPATCHER.trigger('formPageShown', { formId: formId, uuid: uuid, pageNumber: pageNumber });
	};

	function kampyleSetFormObject(formData) {
		window.kpl_formJson = formData;
	}

  var kampyleGetFormObject = function() {
    var formJson = window.kpl_formJson || {};
    if (!formJson.hasOwnProperty("pages") || !formJson.pages.length) {
      return formJson;
    }

    // Backwards compatibility for custom html forms, from 'optionsById' to 'options' contract
    formJson.pages.forEach(function(page) {
      if (page.hasOwnProperty("dynamicData") && page.dynamicData.length) {
        page.dynamicData.forEach(function(component) {
          if (component.optionsById) {
            component.options = component.optionsById.map(function (optionWithId) {return optionWithId.label;});
          }
        });
      }
    });

    return formJson;
  };

	var extractFormScreenCaptureSetting = function() {
		var formObj = kampyleGetFormObject();

		var screenCaptureSettings = (!!formObj && !!formObj.settings) ? formObj.settings.formScreenCaptureSettings : {};

		//Get relevant settings from the form obj
		if (!!formObj && !!formObj.settings)
		{
			screenCaptureSettings.backgroundColor = formObj.settings.formDesignSettings.backgroundColor;
			screenCaptureSettings.submitButtoncolor = formObj.settings.formBasicSettings.submitButtoncolor;
			screenCaptureSettings.closeButtoncolor = formObj.settings.formBasicSettings.closeButtoncolor;
		}

		return screenCaptureSettings;
	};

	var kampyleIsScreenCaptureEnabled = function() {
		var isScreenCaptureEnabled = utils.getData('isScreenCaptureEnabled');
		var device = utils.getData('device');
		return 	(isScreenCaptureEnabled === true || isScreenCaptureEnabled === 'true') && device === 'desktop';
	};

	var kampyleIsScreenCaptureTaken = function() {
		var integrations = utils.getData('integrations');
		return !!integrations && !!integrations.screenCapture && !!integrations.screenCapture.isTaken;
	};

	var kampyleCheckProvision = function(provisionName) {
    var provisions = utils.getData('provisions');
    // the string comparison is a fix to a bug in android SDK that returned the list on provision in a Map<String, String> instead of Mao<String, Boolean>
    // the fix in the android side was made but we should keep the above fix for old versions of the SDK
		return provisions && (provisions[provisionName] === true || provisions[provisionName] === "true");
	};

	var kampyleTriggerScreenCapture = function(callback) {
		if (!kampyleIsScreenCaptureEnabled() ||
			!kampyleCheckProvision('screenCapture') ||
			kampyleIsScreenCaptureTaken())
		{
			return false;
		}

		var formScreenCaptureSettings = extractFormScreenCaptureSetting();
		var screenCaptureSettings = utils.getData('integrations') || {};
		screenCaptureSettings = utils.safeJsonParse(screenCaptureSettings) || {};
		screenCaptureSettings = screenCaptureSettings.screenCapture || {};

		//Concat them both
		for (var prop in formScreenCaptureSettings)
		{
			if (formScreenCaptureSettings.hasOwnProperty(prop)) {
				screenCaptureSettings[prop] = formScreenCaptureSettings[prop];
			}
		}

		// screenCaptureSettings.screenCapture = screenCaptureSettings || {};
		if (!!callback && typeof callback === 'function')
		{
			scCallback = callback;
		}
		KAMPYLE_EVENT_DISPATCHER.trigger('triggerScreenCapture', { formId: KAMPYLE_SDK.utils.getData('formId'), screenCaptureSettings: screenCaptureSettings });
	};

	function handlePopupClose() {
		//In case this is a popup, perform closeForm before hittin 'x' btn
		var data = KAMPYLE_SDK.kampyleGetFormObject();
		if (!!data &&
			!!data.settings &&
			!!data.settings.formBasicSettings &&
			!!data.settings.formBasicSettings.displayType &&
			data.settings.formBasicSettings.displayType.toLowerCase() === 'popupwindow') {
			KAMPYLE_SDK.kampyleCloseWindow();
		}
	}

	function loadMultipleForms(formIds) {
		utils.sendMessage('loadMultipleForms', {
			formId: KAMPYLE_SDK.utils.getData('formId'),
			formIds: formIds || [],
		});
	}

	function routeToForm(destinationForm, formId) {
		utils.sendMessage('routeToForm', {
			formId: formId || KAMPYLE_SDK.utils.getData('formId'),
			destinationForm: destinationForm,
		});
	}

	return {
		//Helper functions / testing
		utils: utils,
		MEMORY: MEMORY,
		kampyleIsScreenCaptureTaken: kampyleIsScreenCaptureTaken,
		kampyleCheckProvision: kampyleCheckProvision,
		extractFormScreenCaptureSetting: extractFormScreenCaptureSetting,
		iFrameHeightChanged: iFrameHeightChanged,
		scrollToTop: scrollToTop,

		//TODO - move into utils
		// kampyleSetIframeHandler: kampyleSetIframeHandler,
		extractUrl: extractUrl,
		extractUrlQueryString: extractUrlQueryString,
		isValidSumbitData: isValidSumbitData,

		//Public SDK
		kampyleInit: kampyleInit,
		kampyleFormPageDisplayed: kampyleFormPageDisplayed,
		kampyleSubmit: kampyleSubmit,
		kampyleCloseWindow: kampyleCloseWindow,
		getAllCustomParams: getAllCustomParams,
		kampyleDeclineInvitation: kampyleDeclineInvitation,
		kampyleIsScreenCaptureEnabled: kampyleIsScreenCaptureEnabled,
		kampyleGetFormObject: kampyleGetFormObject,
		kampyleTriggerScreenCapture: kampyleTriggerScreenCapture,
		handlePopupClose: handlePopupClose,
		kampyleAcceptInvitation: kampyleAcceptInvitation,
		loadMultipleForms: loadMultipleForms,
		routeToForm: routeToForm,
		handleExtraDataEvent: handleExtraDataEvent,
	};
})(window, document);

KAMPYLE_SDK.utils.kampyleEventHandler(window, 'beforeunload', KAMPYLE_SDK.handlePopupClose);

document.onreadystatechange = function () {
	if (document.readyState === 'complete') {
		//document is ready. Do your stuff here
		KAMPYLE_SDK.kampyleInit();
	}
};

window.KAMPYLE_FUNC = window.KAMPYLE_FUNC || {
	kampyleGetData: KAMPYLE_SDK.kampyleGetFormObject,
};
