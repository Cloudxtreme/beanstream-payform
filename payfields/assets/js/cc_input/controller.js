(function(window) {
    'use strict';

    /**
     * The Controller handles UI events and updates the Model.
     */
    function InputController(model, view, config) {
        var self = this;
        self._model = model;
        self._view = view;
        self._config = config;

        self._model.setFieType(self._config.autocomplete);

        self.cardTypeChanged = new beanstream.Event(this);
        self.inputComplete = new beanstream.Event(this);
        self.inputValidityChanged = new beanstream.Event(this);

        // notifier for view
        self._view.render('elements', self._config);

        // listen to view events
        self._view.keydown.attach(function(sender, e) {
            // delete whole date str on delete any char
            if ((self._model.getFieldType() === 'cc-exp') &&
                    (e.keyCode === 8 || e.keyCode === 46)) {

                self._model.setValue('');
                return;
            }

            // Don't override default functionality except for input
            if (beanstream.Helper.isNonInputKey(e)) {
                return;
            }
            e.preventDefault();

            var char;

            // Handle keypad
            if (e.keyCode >= 96 && e.keyCode <= 105) {
                char = String.fromCharCode(e.keyCode - 48);
            } else {
                char = String.fromCharCode(e.keyCode);
            }

            var selectedText = {};
            selectedText.start = e.target.selectionStart;
            selectedText.end = e.target.selectionEnd;

            self.limitInput(char, selectedText);
        });

        self._view.keyup.attach(function(sender, args) {
            if (args.event.keyCode === 8 || args.event.keyCode === 46) {
                // Update model directly from UI on delete
                // keyup is only needed for deletion

                var pos = self._view.getCaretOffset();
                self._model.setCaretPos(pos);

                self._model.setValue(args.inputValue);

                var onBlur = false;
                var value = self._model.getValue();
                self.validate(onBlur, value);
            }
        });

        self._view.input.attach(function(sender, args) {

            // Android only

            var pos = self._view.getCaretOffset();
            self._model.setCaretPos(pos);

            //self._model.setValue(args.inputValue);
            var selectedText = {start: 0, end: args.inputValue.length};
            self.limitInput(args.inputValue, selectedText);

            var onBlur = false;
            var value = self._model.getValue();
            self.validate(onBlur, value);
        });

        self._view.paste.attach(function(sender, e) {
            e.preventDefault();

            var pastedStr = e.clipboardData.getData('text/plain');

            var selectedText = {};
            selectedText.start = e.target.selectionStart;
            selectedText.end = e.target.selectionEnd;

            self.limitInput(pastedStr, selectedText);
        });

        self._view.blur.attach(function(sender, e) {
            var onBlur = true;
            var value = self._model.getValue();
            self.validate(onBlur, value);

        });

        self._view.focus.attach(function(sender, e) {
            var str = self._model.getValue();

            if (self._model.getFieldType() === 'cc-csc') {
                var onBlur = false;
                self._view.render('csc', false);
            }
        });
    }

    InputController.prototype = {
        limitInput: function(str, selectedText) {
            var self = this;

            str = str.replace(/\D/g, ''); // remove non ints from string

            if (!str.length) {
                return;
            }

            // Remove any text selected in ui
            var currentStr = self._model.getValue();
            currentStr =  currentStr.replace(
                currentStr.substring(
                    selectedText.start,
                    selectedText.end
                ), '');

            // insert new char at cursor position
            var inputStr = [currentStr.slice(0,
                selectedText.start),
                str,
                currentStr.slice(selectedText.start)].join('');

            var newStr = inputStr;

            switch (self._model.getFieldType()) {
                case 'cc-number': {
                    newStr = beanstream.Validator.formatCardNumber(newStr);
                    break;
                }
                case 'cc-csc': {
                    newStr = beanstream.Validator.limitLength(newStr, 'cvcLength', self._model.getCardType());
                    break;
                }
                case 'cc-exp': {
                    newStr = beanstream.Validator.formatExpiry(newStr);
                    break;
                }
                default: {
                    break;
                }
            }

            var onBlur = false;
            self.validate(onBlur, newStr);

            // Calculate new caret position
            var caretPos = selectedText.start + str.length; // get caret pos on original string
            inputStr = inputStr.substring(0, caretPos); // remove white spacing
            inputStr = inputStr.replace(/\s+/g, '');
            var match = inputStr.split('').join('\\s*'); // create string for RegEx insensitive to white spacing
            match = new RegExp(match);
            var res = newStr.match(match);

            if (res) {
                res = res[0].toString(); // find unformatted substring in formatted string
                var caretPos = res.length;
                self._model.setCaretPos(caretPos);
            }

            self._model.setValue(newStr);

            if (self._model.getIsValid()) {
                var cardType = self._model.getCardType();
                if (cardType !== '' || self._model.getFieldType() === 'cc-exp') {
                    self.updateFocus(newStr, self._model.getCardType());
                }
            }
        },
        setCardType: function(cardType) {
            var self = this;
            var currentType = self._model.setCardType(cardType);

            if (cardType !== currentType) {
                self._model.setCardType(cardType); // update model for view
                self.cardTypeChanged.notify(cardType); // emit event for form
            }

            // limit and validate csc input if present
            if (self._model.getFieldType() === 'cc-csc') {
                var onBlur = false;
                var value = self._model.getValue();
                value = beanstream.Validator.limitLength(value, 'cvcLength', self._model.getCardType());
                self._model.setValue(value);
                self.validate(onBlur, value);
            }
        },
        setInputValidity: function(args) {
            var self = this;
            self._model.setError(args.error);
            self._model.setIsValid(args.isValid);
            self.inputValidityChanged.notify(args);
        },
        updateFocus: function(str, cardType) {
            var self = this;
            var max;
            str = str.replace(/\s+/g, ''); // remove white spaces from string
            var len = str.length;

            switch (self._model.getFieldType()) {
                case 'cc-number': {
                    max = beanstream.Validator.getMaxLength('length', cardType);
                    break;
                }
                case 'cc-csc': {
                    max = beanstream.Validator.getMaxLength('cvcLength', cardType);
                    break;
                }
                case 'cc-exp': {
                    max = 7; // Format: "MM / YYYY", minus white spacing
                    break;
                }
                default: {
                    break;
                }
            }

            if (max === len) {
                self.inputComplete.notify();
            }
        },
        validate: function(onBlur, value) {
            var self = this;
            if (value === undefined) {
                value = self._model.getValue();
            }

            switch (self._model.getFieldType()) {
                case 'cc-number': {
                    var cardType = beanstream.Validator.getCardType(value);
                    self.setCardType(cardType);
                    var isValid = beanstream.Validator.isValidCardNumber(value, onBlur);
                    self.setInputValidity(isValid);
                    break;
                }
                case 'cc-csc': {
                    var cardType = self._model.getCardType();
                    var isValid = beanstream.Validator.isValidCvc(cardType, value, onBlur);
                    self.setInputValidity(isValid);
                    self._view.render('csc', onBlur);
                    break;
                }
                case 'cc-exp': {
                    var isValid = beanstream.Validator.isValidExpiryDate(value, new Date(), onBlur);
                    self.setInputValidity(isValid);
                    break;
                }
                default: {
                    break;
                }
            }

        }
    };

    // Export to window
    window.beanstream = window.beanstream || {};
    window.beanstream.InputController = InputController;
})(window);