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
      this._replyWithRandomPairs(message);
    }
};

PairBot.prototype._postMessage = function (originalMessage, message) {
  var channel = this._getChannelById(originalMessage.channel);
  this.postMessageToChannel(channel.name, message, {as_user: true});
}

PairBot.prototype._getUsersInRandomOrder = function (originalMessage) {
  var rawStringUsersToPair = originalMessage.text.split('<@'+this.user.id+'>')[1];
  var usersNamesLookingToPair = rawStringUsersToPair.trim().split(' ');
  return shuffle(usersNamesLookingToPair);
}

/**
 * Replies to a message with random pairs
 * @param {object} originalMessage
 * @private
 */
PairBot.prototype._replyWithRandomPairs = function (originalMessage) {
    var users = this._getUsersInRandomOrder(originalMessage);
    var usersInPairs = this._pairUpUsers(users);
    var message = usersInPairs.join('\n');
    this._postMessage(originalMessage, message);
};

/**
 * @param {Array} users
 * @returns {Array}
 * @private
 */
PairBot.prototype._pairUpUsers = function (users) {
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
