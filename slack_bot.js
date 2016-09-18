/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
______     ______     ______   __  __     __     ______
/\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
\ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
\ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
\/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

if (!process.env.token) {
  console.log('Error: Specify token in environment')
  process.exit(1)
}

var Botkit = require('./lib/Botkit.js')
var os = require('os')
var request = require('superagent')

var controller = Botkit.slackbot({
  debug: true
})

var bot = controller.spawn({
  token: process.env.token
}).startRTM()

// refactor

controller.hears(['whakamaori'], ['direct_message', 'direct_mention', 'mention', 'ambient'],function(bot,message) {
  bot.startConversation(message, getWord);
});

getWord = function(response, convo) {
  convo.ask('What word would you like me to translate?', function(response, convo) {
    convo.ask('Would you like me to whakamaori `' + response.text + '`?', [
      {
        pattern: 'ae',
        callback: function(response, convo) {
          convo.say(':hourglass_flowing_sand:')
          fetchTranslation(response,convo)
          convo.next();
        }
      },
      {
        pattern: 'kao',
        callback: function(response, convo) {
          convo.say('Maybe another time then')
          convo.stop();
        }
      },
      {
        default: true,
        callback: function(response, convo) {
          convo.repeat();
          convo.next();
        }
      }
    ]);

    convo.next();

  }, {'key': 'word'});

  fetchTranslation = function(err, convo) {
    request.get('https://test-papakupu.herokuapp.com/v1/translations/1.1')
    .then(function(dictionary){
      userWord = convo.extractResponse('word')
      var words = dictionary.body
      words.map(function(word){
        if(word.english === userWord){
          convo.say('`' + userWord + '` - ' + '`' + word.maori + '`')
          convo.say('...................')
          convo.say('```' + word.maori_sentence + '```')
          convo.say('```' + word.english_sentence + '```')
        }
      })
    })
    .catch(function(err){
      convo.say('kaore taea te whakamaori :expressionless:')
    })
  }
}


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name', 'ko wai koe'],
'direct_message,direct_mention,mention', function(bot, message) {

  var hostname = os.hostname()
  var uptime = formatUptime(process.uptime())

  bot.reply(message,
    ':robot_face: I am a bot named <@' + bot.identity.name +
    '>. I have been running for ' + uptime + ' on ' + hostname + '.')

})

function formatUptime(uptime) {
  var unit = 'second'
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'minute'
  }
  if (uptime > 60) {
    uptime = uptime / 60
    unit = 'hour'
  }
  if (uptime != 1) {
    unit = unit + 's'
  }

  uptime = uptime + ' ' + unit
  return uptime
}
