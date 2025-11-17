sap.ui.define([
    "sap/fe/test/JourneyRunner",
	"sfmapp/project1/test/integration/pages/ZC_SETUP_RULES000List",
	"sfmapp/project1/test/integration/pages/ZC_SETUP_RULES000ObjectPage"
], function (JourneyRunner, ZC_SETUP_RULES000List, ZC_SETUP_RULES000ObjectPage) {
    'use strict';

    var runner = new JourneyRunner({
        launchUrl: sap.ui.require.toUrl('sfmapp/project1') + '/test/flp.html#app-preview',
        pages: {
			onTheZC_SETUP_RULES000List: ZC_SETUP_RULES000List,
			onTheZC_SETUP_RULES000ObjectPage: ZC_SETUP_RULES000ObjectPage
        },
        async: true
    });

    return runner;
});

