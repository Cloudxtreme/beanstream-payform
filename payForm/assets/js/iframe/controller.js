
(function(window) {
    'use strict';

    /**
     * The Controller handles UI events and updates the Model.
     */
    function IframeController(model, view) {
        var self = this;
        self._model = model;
        self._view = view;

    }

    IframeController.prototype = {

        init: function() {
            var self = this;
            self._view.init();
            self._view.render(self.createQueryString(), self._view.readAttributes());
            self._view.attachListeners();
        },
        createQueryString: function() {
            var self = this;

            return 'http://localhost:8000/tokenizationform/test.html?' +
                self.serialize(self._view.readAttributes());

            /*
            return 'https://s3-us-west-2.amazonaws.com/payform-staging/payform/tokenizationform/index.html?' +
                self.serialize(self._view.readAttributes());
            /*
            return 'https://payform.beanstream.com/tokenizationform/index.html?' +
                self.serialize(self._view.readAttributes());
            */
        },

        serialize: function(obj) {
            // source: http://stackoverflow.com/a/1714899
            var str = [];
            for (var p in obj) {
                if (obj.hasOwnProperty(p)) {
                    str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
                }
            }

            return str.join('&');
        }

    };

    // Export to window
    window.beanstream = window.beanstream || {};
    window.beanstream.IframeController = IframeController;
})(window);
