sap.ui.define(['sap/fe/test/ListReport'], function(ListReport) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ListReport(
        {
            appId: 'sfmapp.project1',
            componentId: 'ZC_SETUP_RULES000List',
            contextPath: '/ZC_SETUP_RULES000'
        },
        CustomPageDefinitions
    );
});