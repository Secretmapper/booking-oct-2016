import Future from 'fibers/future'
import { Chat } from '../lib/Collections.js'
import { Wit, log } from './node-wit';

const wit = new Wit({
  accessToken: 'CJOXUBEVD2PLXPJXFTOFKJ3VGR5U4SKS',
  actions: {
    send({sessionId}, response) {
      return new Promise(function(resolve, reject) {
        //Chat.insert({
          //sess_id: sessionId,
          //me: false,
          //msg: response.text
        //})
        return resolve();
      });
    },
    getHotelIn({sessionId, context, text, entities}) {
      if(entities.location && entities.location[0] && entities.location[0].confidence > 0.75) {
        const location = entities.location[0]
        context.missingLoc = false

        context.location = location
        context.hotel = location
      }

      if (entities.datetime && entities.datetime[0]) {
        const date = new Date(Date.parse(entities.datetime[0].value))

        if (date <= new Date()) {
          context.invalidDate = true
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `Unfortunately, we can't help you travel back in time.`
          })
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `not yet anyway... Try giving out a date in the future.`
          })
        } else {
          context.date = date

          context.invalidDate = false
          context.missingDate = false
        }
      }

      console.log(context)
      if (context.location && context.date) {
        const intent = (entities.intent && entities.intent[0].value)

        if (intent == 'cheaper') {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `All right found you an even cheaper hotel, ${context.hotel} at ${context.location}`
          })
        } else if (intent == 'better') {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `All right found you a better rated hotel, ${context.hotel} at ${context.location}`
          })
        }
        else {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `All right found you a great hotel, ${context.hotel} at ${context.location}`
          })
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `Let me know if I should take a look at cheaper options, or on better rated ones`
          })
        }
      } else {
        if (!context.location) {
          if (!context.missingLoc) {
            context.missingLoc = true
            Chat.insert({
              sess_id: sessionId,
              me: false,
              msg: 'Where do you want to go?'
            })
          } else if (context.missingLoc) {
            Chat.insert({
              sess_id: sessionId,
              me: false,
              msg: `Hmm I still don't seem to get where you're going`
            })
            Chat.insert({
              sess_id: sessionId,
              me: false,
              msg: 'Try typing out a more specific address'
            })
          }
        } else if (!context.date) {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: 'When do you plan on staying?'
          })
        }
      }

      return Promise.resolve(context);
    },
  },
  logger: new log.Logger(log.DEBUG)
});

Meteor.methods({
  chat (sess_id, msg, context) {
    try {
      return wit.runActions(sess_id, msg, context)
      .then((context1) => {
        console.log('The session state is now: ' + JSON.stringify(context1));
        return JSON.stringify(context1)
      })
    } catch (e) {
      console.error(e)
    }
  },
  getHotel (msg) {
    let wrap = Meteor.wrapAsync(Meteor.http.get)
    const data = wrap('https://distribution-xml.booking.com/json/getHotelAvailabilityV2?output=room_policies,room_details,hotel_details&checkin=2016-11-01&checkout=2016-11-02&city_ids=-1603135&room1=A,A&rows=10&order_by=popularity', {
      dataType: 'jsonp',
      auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
    })

    const content = JSON.parse(data.content)
    const msgs =
      [
        `I found you this very popular hotel in Sydney. ${content.hotels[0].address}`,
        `If that's not to your liking, I also found a few hotels that are a bit cheaper, or are better rated.`,
      ]
    return { msgs, data: content }
  }
})
