'use strict';

const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config');
const messages = require('../config/messages');
const morningEvent = require('./morning-event');
const blogEvent = require('./blog-event');

const token = config.telegramToken;
const groupId = config.groupId;
const goodMorningRegExp = config.goodMorningRegExp;

let bot = new TelegramBot(token, {polling: true});
let goodMorningGivenToday = false;
let minuteToCheck = generateRandom(0, 59);

bot
  .on('new_chat_participant', newChatParticipant)
  .on('text', newText);

morningEvent
  .on('minuteMark', (vzlanHour, vzlanMinute, weekday) => {
    if (morningConditions(vzlanHour, vzlanMinute)) {
      goodMorningGivenToday = true;
      minuteToCheck = generateRandom(0, 59);
      bot.sendMessage(
        groupId,
        getMorningMsg(weekday)
      );
    }

    function morningConditions(vzlanHour, vzlanMinute) {
      return !goodMorningGivenToday && vzlanHour === config.morningHour
        && vzlanMinute === minuteToCheck;
    }

    function getMorningMsg(weekday) {
      let weekDays = {
        0: 'generic',
        1: 'mondays',
        2: 'generic',
        3: 'generic',
        4: 'generic',
        5: 'fridays',
        6: 'generic',
      };

      let randomIndex = generateRandom(0, messages.goodMornings[weekDays[weekday]].length - 1);
      return messages.goodMornings[weekDays[weekday]][randomIndex];
    }
  })
  .on('newDay', () => {
    goodMorningGivenToday = false;
  });

blogEvent
  .on('newArticles', (articles) => {
    articles.forEach((article) => {
      bot.sendMessage(
        groupId,
        messages.newBlogPost
          .replace('#{author}', article.author)
          .replace('#{link}', article.link)
          .replace('#{title}', article.title),
        {parse_mode: 'Markdown'}
      );
    });
  });

function newText(msg) {
  if (!goodMorningGivenToday && isGoodMorningGiven(msg.text)) {
    goodMorningGivenToday = true;
  }

  function isGoodMorningGiven(text) {
    return goodMorningRegExp.test(text);
  }
}

function newChatParticipant(msg) {
  bot.sendMessage(
    msg.chat.id,
    getFullWelcomeMsg(msg),
    {reply_to_message_id: msg.message_id, parse_mode: 'Markdown'}
  );

  function getFullWelcomeMsg(msg) {
    let nameToBeShown = msg.new_chat_member.first_name;

    if (msg.new_chat_member.username) {
      nameToBeShown = '@' + msg.new_chat_member.username;
    } else if (msg.new_chat_member.hasOwnProperty('last_name')) {
      nameToBeShown = nameToBeShown + ' ' + msg.new_chat_member.last_name;
    }

    return messages.welcomeMsg.replace('#{name}', nameToBeShown);
  }
}

function generateRandom(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
