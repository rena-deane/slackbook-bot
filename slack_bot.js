/*~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
______     ______     ______   __  __     __     ______
/\  == \   /\  __ \   /\__  _\ /\ \/ /    /\ \   /\__  _\
\ \  __<   \ \ \/\ \  \/_/\ \/ \ \  _"-.  \ \ \  \/_/\ \/
\ \_____\  \ \_____\    \ \_\  \ \_\ \_\  \ \_\    \ \_\
\/_____/   \/_____/     \/_/   \/_/\/_/   \/_/     \/_/

~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~*/

if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var Botkit = require('./lib/Botkit.js');
var os = require('os');
var request = require('superagent')

var controller = Botkit.slackbot({
  debug: true
});

var bot = controller.spawn({
  token: process.env.token
}).startRTM();


controller.hears(['hello', 'hi', 'Kia ora'], 'direct_message,direct_mention,mention', function(bot, message) {

  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  }, function(err, res) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction :(', err);
    }
  });


  controller.storage.users.get(message.user, function(err, user) {
    if (user && user.name) {
      bot.reply(message, 'Kia ora ' + user.name + '!!');
    } else {
      bot.reply(message, 'Kia ora ko Keretao toku ingoa :robot_face:.  Would you like to translate?');
    }
  });
});



// Hit API
controller.hears(['whakamaori'], 'direct_message,direct_mention,mention', function(bot, message) {

  controller.storage.users.get(message.user, function(err, user) {
    bot.startConversation(message, function(err, convo) {
      if (!err) {
        convo.ask('What would you like me to translate?', function(response, convo) {
          convo.ask('Would you like me to translate `' + response.text + '`?', [
            {
              pattern: 'ae',
              callback: function(response, convo) {
                convo.say('Maku e kimi i te Reo')
                convo.next();
              }
            },
            {
              pattern: 'kao',
              callback: function(response, convo) {
                convo.say('Random quote - create a new quote table')
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

        }, {'key': 'word'}); // store the results in a field called nickname

        convo.on('end', function(convo) {
          if (convo.status == 'completed') {
            controller.storage.users.get(message.user, function(err, user) {
              if (!user) {
                user = {
                  id: message.user,
                };
              }
              user.name = convo.extractResponse('word');
              controller.storage.users.save(user, function(err, id) {
                request.get('https://test-papakupu.herokuapp.com/v1/translations/1.1')
                  .then((data) => {
                    var english = JSON.parse(data.body[0])
                    bot.reply(message, 'word is: ' + english);
                    console.log('api stuff here: ', english);
                  })
                  .catch((err) => {
                    bot.reply(message, 'Sorry I could not find a transalation for ' + word);
                  })
              });
            });

          } else {
            // this happens if the conversation ended prematurely for some reason
            bot.reply(message, 'Another time then :robot_face:');
          }
        });
      }
    });
  })
});


controller.hears(['shutdown', 'goodnight'], 'direct_message,direct_mention,mention', function(bot, message) {

  bot.startConversation(message, function(err, convo) {

    convo.ask('Are you sure you want me to shutdown?', [
      {
        pattern: bot.utterances.yes,
        callback: function(response, convo) {
          convo.say('Bye!');
          convo.next();
          setTimeout(function() {
            process.exit();
          }, 3000);
        }
      },
      {
        pattern: bot.utterances.no,
        default: true,
        callback: function(response, convo) {
          convo.say('*Phew!*');
          convo.next();
        }
      }
    ]);
  });
});


controller.hears(['uptime', 'identify yourself', 'who are you', 'what is your name', 'ko wai koe'],
'direct_message,direct_mention,mention', function(bot, message) {

  var hostname = os.hostname();
  var uptime = formatUptime(process.uptime());

  bot.reply(message,
    ':robot_face: I am a bot named <@' + bot.identity.name +
    '>. I have been running for ' + uptime + ' on ' + hostname + '.');

  });

  function formatUptime(uptime) {
    var unit = 'second';
    if (uptime > 60) {
      uptime = uptime / 60;
      unit = 'minute';
    }
    if (uptime > 60) {
      uptime = uptime / 60;
      unit = 'hour';
    }
    if (uptime != 1) {
      unit = unit + 's';
    }

    uptime = uptime + ' ' + unit;
    return uptime;
  }
