var KAMPYLE_SDK_URL_HELPER = {
	getUrlFromRegion: function(regionName) {
		switch (regionName) {
			case 'digital-cloud-au':
				return 'https://feedback.digital-cloud.medallia.com.au/feedback/api/feedback/submit';
			case 'digital-cloud-us':
				return 'https://feedback.digital-cloud.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-us-prem':
				return 'https://feedback.digital-cloud-prem.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-us-citi':
				return 'https://feedback.digital-cloud-citi.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-us-stg':
				return 'https://feedback.digital-cloud-us-stg.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-bofa':
				return 'https://feedback.digital-cloud-bofa.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-west':
				return 'https://feedback.digital-cloud-west.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-uk':
				return 'https://feedback.digital-cloud-uk.medallia.eu/feedback/api/feedback/submit';
			case 'digital-cloud-eu':
				return 'https://feedback.digital-cloud.medallia.eu/feedback/api/feedback/submit';
			case 'digital-cloud-eu-stg':
				return 'https://feedback.digital-cloud-eu-stg.medallia.eu/feedback/api/feedback/submit';
			case 'digital-cloud-eu-prem':
				return 'https://feedback.digital-cloud-prem.medallia.eu/feedback/api/feedback/submit';
			case 'digital-cloud-can':
				return 'https://feedback.digital-cloud.medallia.ca/feedback/api/feedback/submit';
			case 'digital-cloud-gov':
				return 'https://feedback.digital-cloud-gov.medallia.com/feedback/api/feedback/submit';
			case 'digital-cloud-gov-stg':
				return 'https://feedback.digital-cloud-gov-stg.medallia.com/feedback/api/feedback/submit';
			case 'prodUsOregon':
				return 'https://feedback.kampyle.com/feedback/api/feedback/submit';
			case 'prodUsOregonMobileSDKV2':
				return 'https://mobilesdk-us.kampyle.com/api/v1/feedback';
			case 'usent':
				return 'https://feedback-usent.kampyle.com/feedback/api/feedback/submit';
			case 'prodEuIrland':
				return 'https://feedback-eu.kampyle.com/feedback/api/feedback/submit';
			case 'prodEuIrlandMobileSDKV2':
				return 'https://mobilesdk-eu.kampyle.com/api/v1/feedback';
			case 'prodAuSydney':
			case 'digital-cloud-syd1':
				return 'https://feedback-au.kampyle.com/feedback/api/feedback/submit';
			case 'prodCanada':
				return 'https://feedback-can.kampyle.com/feedback/api/feedback/submit';
			case 'demoCaCybertron':
				return 'https://feedback-cybertron.kampyle.com/api/feedback/submit';
			case 'digital-cloud-voice':
				return 'https://feedback.digital.voice.va.gov/feedback/api/feedback/submit';
			default:
				console.info('Unknown region', regionName);
				return 'http://local.kampyle.com:8081/feedback/api/feedback/submit';
		}
	},
	getQueryParam: function(qString, qp) {
		var qParams = (qString + '').split('&');
		for(var i = 0; i < qParams.length; i++) {
			var qParamPair = qParams[i].split('=');
			if (qParamPair[0].toLowerCase() === qp) { return qParamPair[1] || ""; }
		}
		return null;
	}
};

(function() {
	//Get the src of this file in order to relatively load the common js file
	var scripts = document.getElementsByTagName('script');
	var scriptsLen = scripts.length;
	var neededSrcPath,
		found = false,
		neededParentNode;

	for (var i = 0; i < scriptsLen && !found; i++) {
		if (scripts[i].src && scripts[i].src.indexOf('kampyle-sdk') !== -1)
		{
			neededParentNode = scripts[i].parentNode || document.getElementsByTagName('body');
			neededSrcPath = scripts[i].src;
			found = true;
		}
	}

	var sdkVersion2 = KAMPYLE_SDK_URL_HELPER.getQueryParam(neededSrcPath.split('?')[1] || '', 'v2') !== null;
	//Cut the relative part from the url
	neededSrcPath = neededSrcPath.substring(0,neededSrcPath.lastIndexOf('/')+1);

	var imported = document.createElement('script');
	imported.src = neededSrcPath + 'kampyle-sdk-common.js';
	if (sdkVersion2) {
		imported.src = neededSrcPath + 'kampyle-sdk-common-v2.js'
	}

	//Append the script to where the sdk was included in the user's custom html page
	neededParentNode.appendChild(imported);

})();
