sap.ui.define(['sap/fe/test/ObjectPage'], function(ObjectPage) {
    'use strict';

    var CustomPageDefinitions = {
        actions: {},
        assertions: {}
    };

    return new ObjectPage(
        {
            appId: 'sfmapp.project1',
            componentId: 'ZC_SETUP_RULES000ObjectPage',
            contextPath: '/ZC_SETUP_RULES000'
        },
        CustomPageDefinitions
    );
});