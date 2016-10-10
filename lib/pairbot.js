var util = require('util');
var path = require('path');
var fs = require('fs');
var chunk = require('lodash.chunk');
var includes = require('lodash.includes');
var shuffle = require('lodash.shuffle');
var Bot = require('slackbots');

var PairBot = function Constructor(settings) {
    this.settings = settings;
    this.settings.name = this.settings.name || 'pairbot';
    this.user = null;
    this.usersToPair = [];
};

// inherits methods and properties from the Bot constructor
util.inherits(PairBot, Bot);

/**
 * Run the bot
 * @public
 */
PairBot.prototype.run = function () {
    PairBot.super_.call(this, this.settings);

    this.on('start', this._onStart);
    this.on('message', this._onMessage);
};

/**
 * On Start callback, called when the bot connects to the Slack server and access the channel
 * @private
 */
PairBot.prototype._onStart = function () {
    this._loadBotUser();
};

/**
 * On message callback, called when a message (of any type) is detected with the real time messaging API
 * @param {object} message
 * @private
 */
PairBot.prototype._onMessage = function (message) {
    if (this._isChatMessage(message) &&
        this._isChannelConversation(message) &&
        !this._isFromPairBot(message) &&
        this._isMentioningPairBot(message)
    ) {
      if (this._isSettingUpConfig(message)) {
        this._setConfig(message);
      } else if (this._isListingUsersToPair(message)) {
        this._replyWithListOfUsersToPair(message);
      } else {
        if (this._isConfigSetUp(message)) {
          this._replyWithRandomPairs(message);
        } else {
          this._replyWithTrySettingUpConfig(message);
        }
      }
    }
};

PairBot.prototype._postMessage = function (originalMessage, message) {
  var channel = this._getChannelById(originalMessage.channel);
  this.postMessageToChannel(channel.name, message, {as_user: true});
}

PairBot.prototype._setConfig = function (originalMessage) {
  var rawStringUsersToPair = originalMessage.text.split('<@'+this.user.id+'> setup')[1];
  var usersNamesLookingToPair = rawStringUsersToPair.trim().split(' ');
  var usersToBePaired = this.users.filter(function(user) {
    return includes(usersNamesLookingToPair, user.name);
  });
  this.usersToPair = shuffle(usersToBePaired);
  this._postMessage(originalMessage, 'Ready to pair :)!\n\n Give it a go with `@pairbot`');
}

PairBot.prototype._replyWithTrySettingUpConfig = function (originalMessage) {
  var message = 'Run `@pairbot list` first to decide which users are going to be getting paired up';
  this._postMessage(originalMessage, message);
}

PairBot.prototype._isListingUsersToPair = function (originalMessage) {
  return originalMessage.text.indexOf('<@'+this.user.id+'> list') > -1;
}

PairBot.prototype._isConfigSetUp = function () {
  return this.usersToPair.length > 0;
}

PairBot.prototype._isSettingUpConfig = function (originalMessage) {
  return originalMessage.text.indexOf('<@'+this.user.id+'> setup') > -1;
}

PairBot.prototype._replyWithListOfUsersToPair = function (originalMessage) {
  var message = 'Reply with a list of all users who want to pair up\n' +
    'e.g. `@pairbot setup christemple robjones chrismckenzie ...`';

  var usersInChannel = this._getUsersInChannel(originalMessage.channel);
  var selectionMessage = usersInChannel.map(function(userInChannel) {
    return userInChannel.name;
  });

  message += '\n\n~ List of users in channel ~\n' + selectionMessage.join('\n');
  this._postMessage(originalMessage, message);
}

/**
 * Replies to a message with random pairs
 * @param {object} originalMessage
 * @private
 */
PairBot.prototype._replyWithRandomPairs = function (originalMessage) {
    var usersInPairs = this._pairUpUsers(this.usersToPair);
    var message = usersInPairs.join('\n');
    this._postMessage(originalMessage, message);
};

PairBot.prototype._getUsersInChannel = function (channelId) {
  var channel = this._getChannelById(channelId);
  return this.users.filter(function(user) {
    return !user.is_bot && includes(channel.members, user.id);
  });
}

/**
 * @param {Array} users
 * @returns {Array}
 * @private
 */
PairBot.prototype._pairUpUsers = function (users) {
    var users = users.map(function(user) {
      return '<@'+user.name+'>';
    });
    var pairs = chunk(users, 2);
    var pairedTogether = pairs.map(function(pair) {
      return pair.join('  &  ');
    })
    return pairedTogether;
};

/**
 * Loads the user object representing the bot
 * @private
 */
PairBot.prototype._loadBotUser = function () {
    var self = this;
    this.user = this.users.filter(function (user) {
        return user.name === self.name;
    })[0];
};

/**
 * Util function to check if a given real time message object represents a chat message
 * @param {object} message
 * @returns {boolean}
 * @private
 */
PairBot.prototype._isChatMessage = function (message) {
    return message.type === 'message' && Boolean(message.text);
};

/**
 * Util function to check if a given real time message object is directed to a channel
 * @param {object} message
 * @returns {boolean}
 * @private
 */
PairBot.prototype._isChannelConversation = function (message) {
    return typeof message.channel === 'string' &&
        message.channel[0] === 'C'
        ;
};

/**
 * Util function to check if a given real time message is mentioning Chuck Norris or the PairBot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
PairBot.prototype._isMentioningPairBot = function (message) {
    return message.text.indexOf('@'+this.user.id) > -1;
};

/**
 * Util function to check if a given real time message has ben sent by the PairBot
 * @param {object} message
 * @returns {boolean}
 * @private
 */
PairBot.prototype._isFromPairBot = function (message) {
    return message.user === this.user.id;
};

/**
 * Util function to get the name of a channel given its id
 * @param {string} channelId
 * @returns {Object}
 * @private
 */
PairBot.prototype._getChannelById = function (channelId) {
    return this.channels.filter(function (item) {
        return item.id === channelId;
    })[0];
};

module.exports = PairBot;
