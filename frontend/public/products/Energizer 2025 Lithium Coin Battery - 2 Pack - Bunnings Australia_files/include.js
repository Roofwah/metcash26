// Bunnings
var _inside = _inside || [];
// var _inside = [];
var _insideLoaded = _insideLoaded || false;
var _insideJQ = _insideJQ || null;
window.updateInsideView = window.updateInsideView || function () { };

(function () {
	if (_insideLoaded) {
		window.updateInsideView();
		return;
	}
	_insideLoaded = true;

	var accountKey = "IN-1000746";
	var trackerURL = "au12-tracker.inside-graph.com";
	var subsiteId = null;
	var insideOrderTotal = 0;
	var _insideMaxLoop = 25;
	var _insideCurLoop = 0;
	var _insideFirstLoad = false;
	var _insideHashJ = null;
	var _insideCartHashJ = null;
	var _insideCheckConnected = false;
	var _insideStoreProdName = "";
	var _insideLoginError = false;
	try {
		_inside.suppressLogging = true;
	} catch (tempex) { }

	// Utility Functions
	function log() {
		if (typeof (console) != "undefined" && typeof (console.log) != "undefined") {
			// console.log("[INSIDE]", Array.prototype.slice.call(arguments));
		}
	}

	var hashJoaat = function (b) { for (var a = 0, c = b.length; c--;)a += b.charCodeAt(c), a += a << 10, a ^= a >> 6; a += a << 3; a ^= a >> 11; return ((a + (a << 15) & 4294967295) >>> 0).toString(16) };

	function debounce(func, wait, immediate) {
		var timeout;
		return function () {
			var context = this, args = arguments;
			var later = function () {
				timeout = null;
				if (!immediate) func.apply(context, args);
			};
			var callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(context, args);
		};
	};

	function deferWait(callback, test) {
		if (test()) {
			callback();
			return;
		}
		var _interval = 10;
		var _spin = function () {
			if (test()) {
				callback();
			}
			else {
				_interval = _interval >= 1000 ? 1000 : _interval * 2;
				setTimeout(_spin, _interval);
			}
		};
		setTimeout(_spin, _interval);
	}

	function keepWait(callback, test) {
		if (test()) {
			callback();
			if (_insideCurLoop >= _insideMaxLoop) {
				return;
			}
		}
		var _interval = 1000;
		var _spin = function () {
			if (test()) {
				_insideCurLoop = _insideCurLoop + 1;
				callback();
				if (_insideCurLoop >= _insideMaxLoop) {
					return;
				}
			}
			setTimeout(_spin, _interval);
		};
		setTimeout(_spin, _interval);
	}

	var indexOf = [].indexOf || function (prop) {
		for (var i = 0; i < this.length; i++) {
			if (this[i] === prop)
				return i;
		}
		return -1;
	};

	function myTrim(text) {
		try {
			if (typeof (text) != "undefined" && text != null)
				return typeof (text.trim) === "function" ? text.trim() : text.replace(/^\s+|\s+$/gm, '');
		} catch (trimex) { }

		return text;
	}

	function isNumeric(n) {
		try {
			return !isNaN(parseFloat(n)) && isFinite(n);
		}
		catch (tempex) {
		}

		return false;
	}

	function setCookie(cname, cvalue, exdays) {
		var hostName = window.location.hostname;
		var siteNameFragments = hostName.split(".");
		var siteName = siteNameFragments[1];
		var domain = siteNameFragments.slice(1, siteNameFragments.length).join(".");

		var d = new Date();
		d.setTime(d.getTime() + (exdays * 24 * 60 * 60 * 1000));
		var expires = "expires=" + d.toGMTString();
		document.cookie = cname + "=" + cvalue + "; " + expires + ";path=/" + ";domain=." + domain;
	}

	function getCookie(cname) {
		var name = cname + "=";
		var ca = document.cookie.split(';');
		for (var i = 0; i < ca.length; i++) {
			var c = myTrim(ca[i]);
			if (c.indexOf(name) == 0)
				return c.substring(name.length, c.length);
		}
		return null;
	}

	function deleteCookie(cname) {
		document.cookie = cname + "=" + 0 + "; " + "expires=01 Jan 1970 00:00:00 GMT" + ";path=/";
	}

	function roundToTwo(num) {
		if (Math != "undefined" && Math.round != "undefined")
			return +(Math.round(num + "e+2") + "e-2");
		else
			return num;
	}

	function getSearchParameters() {
		var prmstr = window.location.search.substring(1);
		return prmstr != null && prmstr != "" ? transformToAssocArray(prmstr) : [];
	}

	function transformToAssocArray(prmstr) {
		var params = [];
		var prmarr = prmstr.split("&");
		for (var i = 0; i < prmarr.length; i++) {
			params[i] = prmarr[i];
		}

		return params;
	}

	function randomIntFromInterval(min, max) {
		try {
			return Math.floor(Math.random() * (max - min + 1) + min);
		}
		catch (tempex) {
		}

		return min;
	}

	function getDecimalSign(number) {
		try {
			var tempnum = myTrim(number);

			if (tempnum.length > 3) {
				return tempnum.charAt(tempnum.length - 3);
			}
		}
		catch (signex) {
		}

		return ".";
	}

	// End of utility functions

	function processInside(tracker) {
		var searchUrl = null;
		var searchQueryString = null;
		var productCategoryUrl = null;
		var productCategoryQueryString = null;
		var productUrl = null;
		var productQueryString = null;
		var checkoutUrl = null;
		var checkoutQueryString = null;
		var orderConfirmedUrl = null;
		var orderConfirmedQueryString = null;

		function getViewData() {
			try {

				// Output view data
				// Default view data is "unknown"

				var data = {};

				data.action = "trackView";
				data.type = "article";
				data.url = window.location.href;
				data.name = "Unknown Page: " + window.location.href;
				var tempurl = window.location.href.toLowerCase();

				var temppath = window.location.pathname;
				var temp_loc = temppath.split("/");
				var page = "";

				var add_tags = [];
				var params = getSearchParameters();
				var searchterm = "Search"; // Find the searchterm the
				// visitor
				// entered for the search page to be
				// used as the page name
				if (params != null && params.length > 0) {
					for (var i = 0; i < params.length; i++) {
						if (params[i].indexOf("q=") == 0) {
							searchterm = params[i].split("q=")[1];
						}
					}
				}

				for (var i = 1; i < temp_loc.length; i++) {
					if (temp_loc[i] != null && temp_loc[i].length > 0) {
						if (temp_loc[i].indexOf("?") != -1) {
							var temploc = temp_loc[i].split("?")[0];
							if (temploc.length > 0)
								page = temp_loc[i];
						}
						else {
							page = temp_loc[i];
						}
					}
				}
				var curpage = page.split("?")[0];
				data.name = page;

				// Identify and assign the correct page type here
				// The part below is actually very flexible, can use
				// dataLayer too
				// sometimes, etc so if needed can also just delete the
				// global
				// variable parts and make your own algorithm. From my
				// experience
				// the following part will rarely work for all websites.

				var temppagetype = "other";
				try {
					if (typeof (_insideData) != "undefined" && _insideData != null && typeof (_insideData.pageType) != "undefined" && _insideData.pageType != null && _insideData.pageType.length > 0) {
						temppagetype = _insideData.pageType.toLowerCase();
					}
					else if (typeof (_insideData) != "undefined" && _insideData != null && typeof (_insideData.page) != "undefined" && _insideData.page != null && typeof (_insideData.page.type) != "undefined" && _insideData.page.type != null && _insideData.page.type.length > 0) {
						temppagetype = _insideData.page.type.toLowerCase();
					}
				} catch (tempex) { }

				if ((temppath == "/" || curpage == "index.html") && temp_loc.length < 3) {
					data.type = "homepage";
				}
				else if (temppagetype == "homepage") {
					data.type = "homepage";
				}
				else if (temppagetype == "search") {
					data.type = "search";
				}
				else if (temppagetype.indexOf("category") != -1) {
					data.type = "productcategory";
				}
				else if (temppagetype == "product") {
					data.type = "product";
				}
				else if (temppagetype == "cart" || temppagetype == "checkout") {
					data.type = "checkout";
				}
				else if (tempurl.indexOf("/login") != -1 || tempurl.indexOf("/register") != -1) {
					data.type = "login";
				}

				if (productCategoryUrl != null) {
					if (tempurl.indexOf(productCategoryUrl.toLowerCase()) > -1) {
						data.type = "productcategory";
					}
				}
				if (productCategoryQueryString != null) {
					var tempelem = _insideJQ(productCategoryQueryString);
					if (tempelem != null && tempelem.length > 0) {
						data.type = "productcategory";
					}
				}

				if (searchUrl != null) {
					if (tempurl.indexOf(searchUrl.toLowerCase()) > -1) {
						data.type = "search";
					}
				}
				if (searchQueryString != null) {
					var tempelem = _insideJQ(searchQueryString);
					if (tempelem != null && tempelem.length > 0) {
						data.type = "search";
					}
				}

				if (productUrl != null) {
					if (tempurl.indexOf(productUrl.toLowerCase()) > -1) {
						data.type = "product";
					}
				}
				if (productQueryString != null) {
					var tempelem = _insideJQ(productQueryString);
					if (tempelem != null && tempelem.length > 0) {
						data.type = "product";
					}
				}

				if (checkoutUrl != null) {
					if (tempurl.search(checkoutUrl.toLowerCase()) > 0) {
						data.type = "checkout";
					}
				}
				if (checkoutQueryString != null) {
					var tempelem = _insideJQ(checkoutQueryString);
					if (tempelem != null && tempelem.length > 0) {
						data.type = "checkout";
					}
				}

				if (orderConfirmedUrl != null) {
					if (tempurl.indexOf(orderConfirmedUrl.toLowerCase()) > -1) {
						data.type = "orderconfirmed";
					}
				}
				if (orderConfirmedQueryString != null) {
					var tempelem = _insideJQ(orderConfirmedQueryString);
					if (tempelem != null && tempelem.length > 0) {
						data.type = "orderconfirmed";
					}
				}

				try {
					if (typeof (_insideData.order) != "undefined" && _insideData.order != null && typeof (_insideData.order.id) != "undefined" && _insideData.order.id != null) {
						if (typeof _insideData.order.id === 'string' || _insideData.order.id instanceof String) {
							if (_insideData.order.id.length > 0)
								data.type = "orderconfirmed";
						}
					}
				} catch (tempex) { }

				// Finish identying

				switch (data.type) {
					case "homepage":
						data.name = "Home";
						break;
					case "search":
						data.name = "Search Result Page";
						if (searchterm != null && searchterm.length > 0) {
							data.name = decodeURIComponent(searchterm);
							if (data.name.indexOf("+") != -1) {
								data.name = data.name.replace(/\+/g, ' ');
							}

							try {
								var tempempty = myTrim(_insideJQ(".resultSummaryContainer .totalResults").text());
								tempempty = tempempty.replace(/[^0-9\.\-\+]/g, "");
								if (tempempty == "0")
									add_tags.push("emptysearch");
							} catch (tempex) { }
						}
						break;
					case "productcategory":
						var tempcat = getCategory();
						if (tempcat != null && tempcat.length > 0) {
							if (tempcat.length > 149)
								tempcat = tempcat.substring(0, 149);
							data.category = tempcat;
						}

						var tempPageName = getPageName();
						if (tempPageName != null && tempPageName.length > 0)
							data.name = tempPageName;

						break;
					case "product":
						var tempPageName = getPageName();
						if (tempPageName != null && tempPageName.length > 0)
							data.name = tempPageName;

						tempPageName = getProductName();
						if (tempPageName != null && tempPageName.length > 0)
							data.name = tempPageName;

						var tempcat = getCategory();
						if (tempcat != null && tempcat.length > 0) {
							if (tempcat.length > 149)
								tempcat = tempcat.substring(0, 149);
							data.category = tempcat;
						}

						var tempval = getProductImage();
						if (tempval != null && tempval.length > 0)
							data.img = tempval;
						else
							data.type = "other";

						var tempsku = getProductSku();
						if (tempsku != null && tempsku.length > 0) {
							data.sku = tempsku;
							data.name = data.name + " - " + tempsku;
						}
						else {
							data.type = "other";
						}

						var tempprice = getProductPrice();
						if (tempprice != null && tempprice > 0)
							data.price = tempprice;

						try {
							if (typeof (data.data) == "undefined" || data.data == null) {
								data.data = {};
							}

							data.data.SpecialOrder = false;
							data.data.AvailableOnline = false;
							data.data.ClickAndCollect = false;

							if (_insideData && _insideData.product) {
								if (_insideData.product.clickandcollect) {
									data.data.ClickAndCollect = true;
								}
								if (_insideData.product.delivery) {
									data.data.AvailableOnline = true;
								}
							}

							if (_insideData && _insideData.productspecialOrder) {
								data.data.SpecialOrder = true;
							}

							var boolcartavailable = false;
							var cartbuttonlength = _insideJQ(".js-product-details-add-to-basket button.product-details-delivery-btn").length;
							if (cartbuttonlength == 1) {
								add_tags.push("addtocartavailable");
								boolcartavailable = true;
							}

							var tempaddtocart = _insideJQ("#pdp-footer-container .addToCartSection button");
							if (tempaddtocart.length > 0 && tempaddtocart.is(":visible")) {
								add_tags.push("addtocartavailable");
								boolcartavailable = true;
							}

							if (!boolcartavailable) {
								add_tags.push("addtocartnotavailable");
							}

							if (data.data.SpecialOrder || data.data.ClickAndCollect) {
								add_tags.push("orderonline");
							}

							var temppdpservice = _insideJQ('.productNavDataContainer [data-locator="pdp_services_list"]');
							if (temppdpservice.length > 0 && temppdpservice.is(":visible")) {
								if (temppdpservice.text().toLowerCase().indexOf("shed installation") != -1 || temppdpservice.text().toLowerCase().indexOf("shed assembly") != -1)
									add_tags.push("shedservice");
								if (temppdpservice.text().toLowerCase().indexOf("air conditioning installation") != -1 || temppdpservice.text().toLowerCase().indexOf("air conditioner installation") != -1)
									add_tags.push("acservice");
								if (temppdpservice.text().toLowerCase().indexOf("bbq assembly") != -1)
									add_tags.push("bbqservice");
								if (temppdpservice.text().toLowerCase().indexOf("clothesline installation") != -1)
									add_tags.push("clotheslineservice");
							}

							var tempcarterror = _insideJQ("[id*=error-message-text]");
							if (tempcarterror.length > 0) {
								add_tags.push("carterror");
							}

							try {
								var tempstorename = _insideJQ('a[data-locator="store-name"]');
								if (tempstorename.length > 0) {
									var tempstockstatus = _insideJQ('span[data-locator="message_OutOfStock"]').text();
									if (tempstockstatus) {
										add_tags.push("outofstockatstore");
									}
								}
							} catch (storenamex) { }
						} catch (tempex) { }
						break;
					case "orderconfirmed":
						data.name = "Order Confirmed";
						break;
					default:
						var tempPageName = getPageName();
						if (tempPageName != null && tempPageName.length > 0)
							data.name = tempPageName;
				}

				try {
					if (tempurl.indexOf("/sign-in") != -1) {
						var temperrorele = _insideJQ(".auth-content .okta-form-infobox-error");
						if (temperrorele.length > 0) {
							add_tags.push("loginerror");
						}
					}
				} catch (loginerrorex) { }

				if (add_tags.length > 0) {
					data.tags = add_tags.join(",");
				}

				// Get view data from page

				return data;
			}
			catch (ex) {
				if (typeof (console) != "undefined" && typeof (console.log) != "undefined")
					log("getViewData error: ", ex);
				return null;
			}
		}

		function getPageName() {
			// Modify if necessary
			try {
				if (typeof (_insideData) != "undefined" && _insideData != null && typeof (_insideData.page) != "undefined" && _insideData.page != null && typeof (_insideData.page.name) != "undefined" && _insideData.page.name != null && _insideData.page.name.length > 0 && (typeof _insideData.page.name === 'string' || _insideData.page.name instanceof String)) {
					return _insideData.page.name;
				}
			} catch (pagenameex) { }

			try {
				var content = document.getElementsByTagName("title");
				if (typeof (content) != "undefined" && content != null && content.length > 0) {
					var result = content[0].textContent || content[0].innerText;
					if (typeof (result) != "undefined" && result != null && result.length > 0) {
						return myTrim(result);
					}
				}
			} catch (pagenameex) { }

			return null;
		}

		function getProductName() {
			try {
				if (_insideData && _insideData.product && _insideData.product.name) {
					return _insideData.product.name;
				}
			} catch (tempex) { }

			return null;
		}

		function getProductImage() {
			try {
				if (_insideData && _insideData.product && _insideData.product.img) {
					if (_insideData.product.img.indexOf("?") > 0) {
						return _insideData.product.img.substring(0, _insideData.product.img.indexOf("?"));
					}
					return _insideData.product.img;
				}
			} catch (tempex) { }

			try {
				var metaTags = document.getElementsByTagName("meta");

				var fbAppIdContent = "";
				for (var i = 0; i < metaTags.length; i++) {
					if (metaTags[i].getAttribute("property") == "og:image") {
						fbAppIdContent = metaTags[i].getAttribute("content");
						if (fbAppIdContent.indexOf("?") > 0) {
							return fbAppIdContent.substring(0, fbAppIdContent.indexOf("?"));
						}
						return fbAppIdContent;
					}
				}
			}
			catch (tempex) {
			}

			return null;
		}

		function getProductPrice() {
			try {
				if (_insideData && _insideData.product && _insideData.product.price) {
					return _insideData.product.price;
				}
			} catch (tempex) { }

			return null;
		}

		function getProductSku() {
			try {
				if (_insideData && _insideData.product && _insideData.product.sku) {
					return _insideData.product.sku;
				}
			} catch (tempex) { }

			return null;
		}

		function getCategory() {
			try {
				if (typeof (_insideData) != "udnefined" && _insideData != null && _insideData.product && _insideData.product.allCategories) {
					var tempcategory = [];
					for (var i = 0; i < _insideData.product.allCategories.length; i++) {
						if (_insideData.product.allCategories[i] && _insideData.product.allCategories[i].displayName)
							tempcategory.push(_insideData.product.allCategories[i].displayName);
					}

					if (tempcategory.length > 0)
						return tempcategory.join(" / ");
				}
			}
			catch (tempex) {
			}

			try {
				var breadcrumbs = _insideJQ(".breadcrumbs");

				if (breadcrumbs != null && breadcrumbs.length > 0) {
					var path = "";
					for (var i = 1; i < breadcrumbs.length; i++) {
						var temp = breadcrumbs[i].innerText || breadcrumbs[i].textContent;
						var tempelem = breadcrumbs[i].getElementsByTagName("a");
						if (tempelem != null && tempelem.length > 0) {
							temp = tempelem[0].innerText || tempelem[0].textContent;
						}
						temp = myTrim(temp);
						if (temp != "/")
							path += (path != "" ? " / " : "") + temp;
					}
					if (path != "")
						return path;

				}
			}
			catch (tempex) {
			}

			return null;
		}

		function getOrderData() {
			try {
				var data = [];
				var totalprice = 0;
				var orderId = "auto";

				if (_insideData && _insideData.cart && _insideData.cart.item && _insideData.cart.item.length > 0) {
					_insideJQ.each(_insideData.cart.item, function (tempindex, tempitem) {
						var insideitem = {};
						insideitem.action = "addItem";
						insideitem.orderId = orderId;
						insideitem.name = tempitem.name;
						insideitem.img = tempitem.img;
						insideitem.price = parseFloat(tempitem.price);
						insideitem.sku = tempitem.sku;
						insideitem.qty = parseFloat(tempitem.qty);

						totalprice = totalprice + (insideitem.price * insideitem.qty);

						try {
							if (insideitem.img.indexOf("?") > 0) {
								insideitem.img = insideitem.img.substring(0, insideitem.img.indexOf("?"));
							}

							if (tempitem.url) {
								insideitem.url = tempitem.url;
								if (insideitem.url.indexOf("//") == -1) {
									insideitem.url = "//" + window.location.hostname + insideitem.url;
								}
							}
						} catch (urlex) { }

						data.push(insideitem);
					});
				}

				if (data.length > 0) {

					data.push({
						"action": "trackOrder",
						"orderId": orderId,
						"orderTotal": totalprice
					});

					return data;
				}
			}
			catch (ex) {
				log("getOrderData error. ", ex);
			}

			return null;
		}

		function orderConfirmProcess() {
			try {
				var data = [];
				var tempcurrency = null;

				var detail = null;
				if (typeof (dataLayer) != "undefined" && dataLayer != null && dataLayer.length > 0) {
					for (var i = 0; i < dataLayer.length; i++) {
						if (typeof (dataLayer[i].ecommerce) != "undefined" && dataLayer[i].ecommerce != null
							&& typeof (dataLayer[i].ecommerce.purchase) != "undefined" && dataLayer[i].ecommerce.purchase != null
							&& typeof (dataLayer[i].ecommerce.purchase.actionField) != "undefined"
							&& dataLayer[i].ecommerce.purchase.actionField != null
							&& typeof (dataLayer[i].ecommerce.purchase.actionField.id) != "undefined"
							&& dataLayer[i].ecommerce.purchase.actionField.id != null
							&& dataLayer[i].ecommerce.purchase.actionField.id.length > 0) {
							detail = dataLayer[i].ecommerce.purchase;
							if (typeof (dataLayer[i].ecommerce.currencyCode) != "undefined" && dataLayer[i].ecommerce.currencyCode != null) {
								tempcurrency = dataLayer[i].ecommerce.currencyCode.toUpperCase();
							}
						}
					}
				}

				if (detail != null) {
					var totalprice = detail.actionField.revenue;
					var orderID = detail.actionField.id;
					var temppurchasedata = {};

					if (typeof (detail.actionField.shipping) != "undefined" && detail.actionField.shipping != null) {
						temppurchasedata.shipping = detail.actionField.shipping;
					}
					if (typeof (detail.actionField.tax) != "undefined" && detail.actionField.tax != null) {
						temppurchasedata.tax = detail.actionField.tax;
					}
					if (tempcurrency != null) {
						temppurchasedata.currency = tempcurrency;
					}

					// var details = detail.products;

					// for (var i = 0; i < details.length; i++)
					// {
					// var price = details[i].price;
					// var qty = details[i].quantity;
					// var item_name = details[i].name;
					// var sku = details[i].id;
					//
					// data.push({
					// "action" : "addItem",
					// "orderId" : "auto",
					// "name" : myTrim(item_name),
					// "price" : price,
					// "img" : details[i].ImageURL,
					// "sku" : myTrim(sku),
					// "qty" : qty
					// });
					// }

					if (typeof (orderID) != "undefined" && orderID != null && orderID.length > 0 && orderID != "auto") {

						try {
							var lastOrderID = sessionStorage.getItem("insidelastorderid");
							if (lastOrderID == orderID) {
								return null;
							}
						}
						catch (orderidex) {
						}

						// data.push({
						// "action" : "trackOrder",
						// "orderId" : "auto",
						// "newOrderId" : orderID,
						// "orderTotal" : totalprice
						// });

						data.push({
							"action": "trackOrder",
							"orderId": "auto",
							"newOrderId": orderID,
							"orderTotal": totalprice,
							"data": temppurchasedata,
							"update": true,
							"complete": true
						});
					}

					return data;
				}
			}
			catch (ex) {
				log("orderConfirmProcess error. ", ex);
			}

			try {
				var data = [];

				var detail = _insideData.order;

				if (detail != null) {
					var totalprice = detail.total;
					var orderID = detail.id;
					var temppurchasedata = {};

					if (typeof (detail.shipping) != "undefined" && detail.shipping != null) {
						temppurchasedata.shipping = parseFloat(detail.shipping.replace(/[^0-9\.\-\+]/g, ""));
					}
					if (typeof (detail.tax) != "undefined" && detail.tax != null) {
						temppurchasedata.tax = detail.tax;
					}

					try {
						var temporderdata = getOrderData();
						if (temporderdata && temporderdata.length > 0)
							data = temporderdata;
					} catch (orderex) { }

					if (typeof (orderID) != "undefined" && orderID != null && orderID.length > 0 && orderID != "auto") {
						try {
							var lastOrderID = sessionStorage.getItem("insidelastorderid");
							if (lastOrderID == orderID) {
								return null;
							}
						}
						catch (orderidex) {
						}

						data.push({
							"action": "trackOrder",
							"orderId": "auto",
							"newOrderId": orderID,
							"orderTotal": totalprice,
							"data": temppurchasedata,
							"update": true,
							"complete": true
						});
					}

					return data;
				}
			}
			catch (ex) {
				log("orderConfirmProcess error. ", ex);
			}

			return null;
		}

		function getVisitorId() {
			try {
				if (navigator.userAgent.toLowerCase().indexOf("bunningsbot") != -1) {
					return null;
				}

				if (_insideData && _insideData.user && _insideData.user.email && _insideData.user.email.indexOf("@") != -1 && _insideData.user.email.indexOf(".") != -1)
					return _insideData.user.email;
			}
			catch (visitidex) {
			}

			return null;
		}

		function getVisitorName() {
			try {
				if (_insideData && _insideData.user && _insideData.user.email && _insideData.user.email.indexOf("@") != -1 && _insideData.user.email.indexOf(".") != -1 && _insideData.user.name)
					return _insideData.user.name;
			}
			catch (visitidex) {
			}

			return null;
		}

		function getVisitorData() {
			try {
				if (typeof (_insideData) != "undefined" && _insideData != null && _insideData) {
					var tempdata = {};

					if (_insideData.country)
						tempdata.country = _insideData.country;

					if (_insideData.language)
						tempdata.language = _insideData.language;

					var tempemail = getVisitorId();
					if (tempemail && tempemail != null) {
						tempdata.user_email = tempemail;
					}

					var tempname = getVisitorName();
					if (tempname && tempname != null) {
						tempdata.user_name = tempname;
					}

					if (_insideData.user && _insideData.user.industrySegment) {
						tempdata.industrySegment = _insideData.user.industrySegment;
					}

					try {
						var tempstorename = _insideJQ('a[data-locator="store-name"]');
						if (tempstorename.length > 0) {
							tempdata.storeName = tempstorename.clone().children().remove().end().text();
							_insideStoreProdName = tempdata.storeName;
						}
						else {
							tempstorename = _insideJQ('h3[data-locator="Title_StoreName"]').text();
							if (tempstorename)
								tempdata.storeName = tempstorename;
						}

						if (tempdata.storeName) {
							var tempstockstatus = _insideJQ('span[data-locator="message_OutOfStock"]').text();
							if (tempstockstatus) {
								tempdata.stockStatus = tempstockstatus;
							}
							else {
								tempstockstatus = _insideJQ('span[data-locator="message_InStock"]').text();
								if (tempstockstatus) {
									tempdata.stockStatus = tempstockstatus;
								}
							}
						}
					} catch (storenamex) { }

					return tempdata;
				}
			}
			catch (visitidex) {
			}

			return null;
		}

		function insertInsideTag() {
			try {
				_insideGraph.processQueue();

				_insideHashJ = hashJoaat(JSON.stringify(_insideData));
				_insideCartHashJ = hashJoaat(JSON.stringify(_insideData.cart));
			}
			catch (tempex) {
			}
		}

		function sendToInside() {
			try {
				tracker.url = window.location.href;

				var visitorId = getVisitorId();
				if (visitorId != null && visitorId.length > 0) {
					tracker.visitorId = visitorId;
				}

				var visitorName = getVisitorName();
				if (visitorName != null && visitorName.length > 0) {
					tracker.visitorName = visitorName;
				}

				var visitorData = getVisitorData();
				if (visitorData != null) {
					tracker.visitorData = visitorData;
				}

				var view = getViewData();
				if (view != null) {
					if (view.type == "orderconfirmed") {
						var tempconfirm = orderConfirmProcess();
						if (tempconfirm != null && tempconfirm.length > 0) {
							for (var i = 0; i < tempconfirm.length; i++) {
								_inside.push(tempconfirm[i]);

								try {
									if (tempconfirm[i].action == "trackOrder")
										if (typeof (tempconfirm[i].newOrderId) != "undefined" && tempconfirm[i].newOrderId != null)
											sessionStorage.setItem("insidelastorderid", tempconfirm[i].newOrderId);
								}
								catch (tempex) {
								}
							}
						}
						else {
							view.type == "other";
						}
					}
					else {
						var orderData = getOrderData();

						if (orderData != null && orderData.length > 0) {
							var insertInsideCartData = true;
							try {
								var tempcurhashcartj = hashJoaat(JSON.stringify(_insideData.cart));
								if (tempcurhashcartj == _insideCartHashJ) {
									if (_insideCartHashJ && insideOrderTotal) {
										view.orderId = "auto";
										view.orderTotal = insideOrderTotal;
										insertInsideCartData = false;
									}
								}
							} catch (tempex) { }

							if (insertInsideCartData) {
								for (var i = 0; i < orderData.length; i++) {
									_inside.push(orderData[i]);
									if (orderData[i].action == "trackOrder") {
										view.orderId = orderData[i].orderId;
										view.orderTotal = orderData[i].orderTotal;
										insideOrderTotal = orderData[i].orderTotal;
									}
								}
							}
						}
					}

					// Add currency code
					try {
						var _insideCurrency = null;
						if (_insideData && _insideData.currency)
							_insideCurrency = _insideData.currency.toUpperCase();

						if (_insideCurrency) {
							if (_inside != null && _inside.length > 0) {
								for (var i = 0; i < _inside.length; i++) {
									if (_inside[i].action == "trackOrder") {
										if (typeof (_inside[i].data) == "undefined" || _inside[i].data == null) {
											_inside[i].data = {};
										}

										if (typeof (_inside[i].data.currency) == "undefined" || _inside[i].data.currency == null) {
											_inside[i].data.currency = _insideCurrency;
										}
									}
								}
							}

							if (typeof (view.data) == "undefined" || view.data == null) {
								view.data = {};
							}
							view.data.currency = _insideCurrency;

							if (typeof (tracker.visitorData) == "undefined" || tracker.visitorData == null) {
								tracker.visitorData = {};
							}
							tracker.visitorData.currency = _insideCurrency;
						}
					} catch (currencyex) { }

					_inside.push(view);

					log("Inside Debug: ", _inside);
				}
			}
			catch (sendex) {
				_inside = [];

				_inside.push({
					"action": "trackView",
					"type": "other",
					"name": "Check: " + window.location.href
				});

				log(sendex);
			}

			insertInsideTag();
			if (!_insideFirstLoad)
				_insideFirstLoad = true;
		}

		window.updateInsideView = debounce(function () {
			var triggerupdate = true;
			try {
				var temphashj = hashJoaat(JSON.stringify(_insideData));
				if (temphashj == _insideHashJ)
					triggerupdate = false;
			} catch (tempex) { }

			if (triggerupdate) {
				_insideHashJ = hashJoaat(JSON.stringify(_insideData));
				deferWait(sendToInside, function () {
					return _insideCheckConnected;
				});
			}
		}, 1000);

		var tempview = getViewData();
		if (tempview != null && typeof (tempview.type) != "undefined" && tempview.type != null && tempview.type == "orderconfirmed") {
			deferWait(sendToInside, function () {
				var tempconfirm = orderConfirmProcess();
				if (tempconfirm != null && tempconfirm.length > 0) {
					return true;
				}

				return document.readyState != 'loading' && document.readyState != 'interactive';
			});
		}
		else {
			deferWait(sendToInside, function () {
				if ((typeof (_insideData) != "undefined" && _insideData != null) || (document.readyState != 'loading' && document.readyState != 'interactive')) {
					if ((typeof (_insideData) != "undefined" && _insideData != null && _insideData.language && _insideData.currency) || (document.readyState != 'loading' && document.readyState != 'interactive')) {
						keepWait(sendToInside, function () {
							if (!_insideFirstLoad)
								return false;

							if (typeof (_insideGraph) != "undefined" && _insideGraph != null && _insideCheckConnected) {
								var temporderdata = getOrderData();

								if (temporderdata != null && temporderdata.length > 0) {
									for (var i = 0; i < temporderdata.length; i++) {
										if (temporderdata[i].action == "trackOrder") {
											if (insideOrderTotal != temporderdata[i].orderTotal) {
												return true;
											}
										}
									}
								}
								else if (insideOrderTotal > 0) {
									insideOrderTotal = 0;
									return true;
								}

								try {
									if (typeof (_insideData) != "undefined" && _insideData != null && _insideData.page && _insideData.page.type && _insideData.page.type.toLowerCase() == "product") {
										var tempstorename = _insideJQ('a[data-locator="store-name"]');
										if (tempstorename.length > 0) {
											var tempstorenametext = tempstorename.clone().children().remove().end().text();
											if (_insideStoreProdName != tempstorenametext) {
												_insideStoreProdName = tempstorenametext;
												return true;
											}
										}
									}

									if (!_insideLoginError && window.location.href.toLowerCase().indexOf("/sign-in") != -1) {
										var temperrorele = _insideJQ(".auth-content .okta-form-infobox-error");
										if (temperrorele.length > 0) {
											_insideLoginError = true;
											return true;
										}
									}
								} catch (tempex) { }
							}

							return false;
						});

						return true;
					}
				}

				return false;
			});
		}
	}

	if (window.location.href.indexOf("no_insidechat=true") != -1) {
		return;
	}
	else {
		if (typeof (_insideGraph) != "undefined" && _insideGraph != null && typeof (_insideGraph.current) != "undefined" && _insideGraph.current != null) {
			processInside(_insideGraph.current)
		}
		else {
			var insideTracker = {
				"action": "getTracker",
				"crossDomain": false,
				"account": accountKey
			};

			try {
				var temphost = window.location.host.toLowerCase();
				if (temphost.indexOf(".com.au") != -1) {
					subsiteId = "5";
					if (temphost.indexOf("trade.") != -1) {
						subsiteId = "8";
					}
				}
				else if (temphost.indexOf(".co.nz") != -1) {
					subsiteId = "7";
					if (temphost.indexOf("trade.") != -1) {
						subsiteId = "9";
					}
				}
			} catch (tempex) { }

			if (typeof (subsiteId) != "undefined" && subsiteId != null)
				insideTracker["subsiteId"] = subsiteId;

			_inside.push(insideTracker);

			_inside.push({
				"action": "bind",
				"name": "onload",
				"callback": function (tracker) {
					if (_insideFirstLoad)
						return;

					_insideJQ = _insideGraph.jQuery;

					processInside(tracker)
				}
			});

			_inside.push({
				"action": "bind",
				"name": "onconnected",
				"callback": function (insideConnectedVar) {
					_insideCheckConnected = insideConnectedVar;
				}
			});

			(function (w, d, s, u) {
				a = d.createElement(s), m = d.getElementsByTagName(s)[0];
				a.async = 1;
				a.src = u;
				m.parentNode.insertBefore(a, m);
			})(window, document, "script", "//" + trackerURL + "/ig.js");
		}
	}

	try {
		var _insideMouseOut = _insideMouseOut || true;
		function callEventListener(eventLabel) {
			// The function below will wait until the object insideFrontInterface and the functiong is available
			if (typeof (insideFrontInterface) == "undefined" || insideFrontInterface == null || typeof insideFrontInterface.triggerVisitorEvent == "undefined" || insideFrontInterface.triggerVisitorEvent == null) {
				setTimeout(callEventListener, 500);
				return;
			}

			insideFrontInterface.triggerVisitorEvent(eventLabel);
		}

		function addInsideEvent(obj, evt, fn) {
			if (obj.addEventListener) {
				obj.addEventListener(evt, fn, false);
			}
			else if (obj.attachEvent) {
				obj.attachEvent("on" + evt, fn);
			}
		}

		addInsideEvent(document, "mouseout", function (e) {
			e = e ? e : window.event;
			var from = e.relatedTarget || e.toElement;
			if ((!from || from.nodeName == "HTML") && e.clientY < 1) {
				if (typeof (_insideGraph) != "undefined" && _insideGraph != null && typeof (_insideGraph.jQuery) != "undefined"
					&& _insideGraph.jQuery != null && typeof (_insideGraph.current) != "undefined" && _insideGraph.current != null) {
					if (_insideMouseOut) {
						callEventListener("exit_intent");
					}

					_insideMouseOut = false;
				}
			}
		});

		deferWait(function () {
			var websiteId = insideFrontInterface.chat.userid.split(':')[1];
			_insideGraph.loadJS(_insideCDN + 'custom/' + websiteId + '-customScript.js?v=' + _insideScriptVersion);
		}, function () {
			return typeof _insideGraph != 'undefined' && _insideGraph.loadJS && typeof insideFrontInterface != 'undefined' && insideFrontInterface.chat && insideFrontInterface.chat.userid;
		});
	}
	catch (tempex) {
	}

})();