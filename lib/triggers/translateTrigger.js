var util = require('util');
var BaseTrigger = require('./baseTrigger.js').BaseTrigger;
var request = require('request');
var TinyCache = require('tinycache');
var cache = new TinyCache(); 
/*
Trigger that translates text to a different language using http://hablaa.com
translatecommand - defaults to !translate
languagescommand - defaults to !languages
*/

var TranslateTrigger = function() {
	TranslateTrigger.super_.apply(this, arguments);
};

util.inherits(TranslateTrigger, BaseTrigger);

var type = 'TranslateTrigger';
exports.triggerType = type;
exports.create = function(name, chatBot, options) {
	var trigger = new TranslateTrigger(type, name, chatBot, options);
		trigger.options.translatecommand = trigger.options.translatecommand || '!translate';
		trigger.options.languagescommand = trigger.options.languagescommand || '!languages';
	return trigger;
};

TranslateTrigger.prototype._respondToFriendMessage = function(userId, message) {
	return this._respond(userId, userId, message);
}

TranslateTrigger.prototype._respondToChatMessage = function(roomId, chatterId, message) {
	return this._respond(roomId, chatterId, message);
}

TranslateTrigger.prototype._respond = function(toId, userId, message) {
	var that = this;
	var query = this._stripCommand(message, this.options.translatecommand );
	var translateResult = {};
	if(query && query.params.length === 4) {
		request.get({method: 'GET', encoding: 'utf8', uri: 'http://hablaa.com/hs/translation/' + query.params[1] + '/' + query.params[2] + '-' + query.params[3] + '/', json: true, followAllRedirects: true}, function(error, response, body) {
			if(error) {
				that._sendMessageAfterDelay(toId, 'An error has occured.');
				that.winston.warn('Code ' + response.statusCode + ' received from hablaa.com');
				return;
			}
			else {
				translateResult = body[0];
				var result = translateResult.text;
				if(result === undefined) {
					that._sendMessageAfterDelay(toId, query.params[1] + ' is not a word.');
				}
				else {
					that._sendMessageAfterDelay(toId, result);
				}
			}
		});
		return true;
	} 
	else if(query) {
		this._sendMessageAfterDelay(toId, '\'' + this.options.translatecommand + ' Hello eng spa\' translates to \'Hola\'.');
		return true;
	}
	
	query = this._stripCommand(message, this.options.languagescommand);
	if(query) {
			try {
				that._getLanguageList(toId, userId, query.params);
				return true;
			}
			catch(err) {
				that._sendMessageAfterDelay(toId, 'Error: ' + err);
				console.log(err.stack);
				return true;
			}
	}
	return false;
}	

TranslateTrigger.prototype._stripCommand = function(message, command) {
	if (command && message && message.toLowerCase().indexOf(command.toLowerCase()) === 0) {
		return {message: message, params: message.split(" ")};
	} 
	else if (this.options.command && message && message.toLowerCase().indexOf(this.options.command.toLowerCase()) === 0) {
		return {message: message, params: message.split(" ")};
	}
	return null;
}

TranslateTrigger.prototype._getLanguageList = function(toId, userId, params) {
	var that = this;
	if(!cache.get('languagelist')) {
		request.get({method: 'GET', encoding: 'utf8', uri: 'http://hablaa.com/hs/languages/', json: true}, 
			function(error, response, body) {
				if(error) {
					that._sendMessageAfterDelay(toId, 'An error has occured.');
					that.winston.warn('Code ' + response.statusCode + ' received from hablaa.com');
					return;
				}
				else {
					var languageCodes = body.map(function(lang) {
						return lang.lang_code;
					});
					cache.put('languagelist', body);
					
					function objectFindByKey(array, key, value) {
						for (var i = 0; i < array.length; i++) {
							if (array[i][key] === value) {
								return array[i].name;
							}
						}
						return 'not a valid language code.';
					}
					
					var result_obj = objectFindByKey(body, 'lang_code', params[1]);

					if(params[1]) {
						if(result_obj === undefined) that._sendMessageAfterDelay(toId, params[1] + ' is not a valid language code.');
						else that._sendMessageAfterDelay(toId, params[1] + ' is ' + result_obj);
					
					}
					else {
						that._sendMessageAfterDelay(userId, 'To get the full name of a language, put it after the command. Valid language codes are \'' + languageCodes + "'");
						if(toId !== userId) {
							that._sendMessageAfterDelay(toId, 'To get the full name of a language, put it after the command. Use this in private to get a list of languages.');
						}
					}
				}
		});
	}
	else {
		var body = cache.get('languagelist');
		
		var languageCodes = body.map(function(lang) {
			return lang.lang_code;
		});
		
		function objectFindByKey(array, key, value) {
			for (var i = 0; i < array.length; i++) {
				if (array[i][key] === value) {
					return array[i].name;
				}
			}
			return 'not a valid language code.';
		}
					
		var result_obj = objectFindByKey(body, 'lang_code', params[1]);

		if(params[1]) {
			if(result_obj === undefined) that._sendMessageAfterDelay(toId, params[1] + ' is not a valid language code.');
			else that._sendMessageAfterDelay(toId, params[1] + ' is ' + result_obj);
		
		}
		else {
			that._sendMessageAfterDelay(userId, 'To get the full name of a language, put it after the command. Valid language codes are \'' + languageCodes + "'");
			if(toId !== userId) {
			that._sendMessageAfterDelay(toId, 'To get the full name of a language, put it after the command. Use this in private to get a list of languages.');
			}
		}
	}
	return true;
}