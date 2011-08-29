// ==UserScript==
// @name          Dark DeskSMS 2
// @namespace     http://userstyles.org
// @description	  Themed original Site by Koush but he has since moved desk sms.
// @author        wavedashdoc
// @homepage      http://userstyles.org/styles/52938
// @include       http://desksms.appspot.com/*
// @include       https://desksms.appspot.com/*
// @include       http://*.desksms.appspot.com/*
// @include       https://*.desksms.appspot.com/*
// @include       desksms.appspot.com/#*
// @run-at        document-start
// ==/UserScript==
(function() {
var css = "body\n{\nmargin:0;\nfont-family:\"Helvetica Neue\",Helvetica,Arial,sans-serif;\nfont-size:13px;\nfont-weight:normal;\nline-height:18px;\ncolor:#d4d4d4 !important;\ntext-rendering:optimizeLegibility;\n}\n\n\nhtml,body\n{\nbackground-color: #1e1e1e !important;\n}\n\nform .uneditable-input\n{\nbackground-color:#222222 !important;\ndisplay:block;\nborder-color:#ccc;\n-webkit-box-shadow:inset 0 1px 2px rgba(0, 0, 0, 0.075);\n-moz-box-shadow:inset 0 1px 2px rgba(0, 0, 0, 0.075);\nbox-shadow:inset 0 1px 2px rgba(0, 0, 0, 0.075);\n}\n\n\nh1,h2,h3,h4,h5,h6\n{\nfont-size:14px !important;\nfont-weight:bold;\ncolor:#0393D8 !important;\n}\n\nh6\n{\nfont-size:12px !important;\ncolor:#696969 !important;\ntext-transform:uppercase;\n}\n\nh1\n{\nmargin-bottom:18px;\nfont-size:30px;\nline-height:36px;\n}\nh1 small,h2 small,h3 small,h4 small,h5 small,h6 small\n{\ncolor:#000000 !important;\n}\n\n.well{background-color:#313131 !important;\n}";
if (typeof GM_addStyle != "undefined") {
	GM_addStyle(css);
} else if (typeof PRO_addStyle != "undefined") {
	PRO_addStyle(css);
} else if (typeof addStyle != "undefined") {
	addStyle(css);
} else {
	var heads = document.getElementsByTagName("head");
	if (heads.length > 0) {
		var node = document.createElement("style");
		node.type = "text/css";
		node.appendChild(document.createTextNode(css));
		heads[0].appendChild(node); 
	}
}
})();