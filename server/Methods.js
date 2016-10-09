import Future from 'fibers/future'
import { Chat, Hotel } from '../lib/Collections.js'
import _ from 'underscore'
import { Wit, log } from './node-wit';

const getRoom = ({numOfAdults}) => {
  var arr = []
  for (var i = 0; i < numOfAdults; i++) {
    arr.push('A')
  }
  return arr.join(',')
}

const wit = new Wit({
  accessToken: '3KGZPBMGUVO6MZPGPWHDWFZEK7AKI53E',
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
      console.log(entities)

      let wrap = Meteor.wrapAsync(Meteor.http.get)
      let wasAskingForDest = false

      console.log(context.askingForDestination)
      if (context.askingForDestination) {
        wasAskingForDest = true
        const locationEntity = (entities.location && entities.location[0])
        const isNum = Number.isInteger(text)
        const resp = wrap(`https://distribution-xml.booking.com/json/bookings.autocomplete?text=${context.location.data.value}&languagecode=en`, {
          dataType: 'jsonp',
          auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
        })
        if (isNum) {
          const { longitude, latitude } = resp.data[Number.parseInt(text)]
          context.location = { type: 'coords', data: { longitude, latitude } }
        } else if (locationEntity != resp.data[0].city_name) {
          const resp = wrap(`https://distribution-xml.booking.com/json/bookings.autocomplete?text=${locationEntity}&languagecode=en`, {
            dataType: 'jsonp',
            auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
          })
        }
        context.askingForDestination = false
      }

      if (context.askingForCount && (text.indexOf('no one') || text.indexOf('people') || text.indexOf('just me') || (entities.age_of_person && entities.age_of_person.length > 0))) {
        const people = text.split(' ')[0]

        let num_of_adults = 0

        if (text == 'just me') {
          num_of_adults = 1
          context.numOfAdults = num_of_adults
          context.askingForCount = false
        } else if (text == 'no one') {
          num_of_adults = 1
          context.numOfAdults = num_of_adults
          context.askingForCount = false
        } else if (people && text.indexOf('people') != -1) {
          num_of_adults = people
          context.numOfAdults = parseInt(num_of_adults)
          context.askingForCount = false
        } else {
          Chat.insert(`Couldn't quite get that. Try 'just me' or '5 people'?`)
          return Promise.resolve(context);
        }
      }

      if(entities.location && entities.location[0] && entities.location[0].confidence > 0.75) {
        const location = entities.location[0]
        context.missingLoc = false

        context.location = { type: 'entity', data: location }
        context.initLocation = location.value

        const resp = wrap(`https://distribution-xml.booking.com/json/bookings.autocomplete?text=${location.value}&languagecode=en`, {
          dataType: 'jsonp',
          auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
        })
        if (resp.data.length > 1 && resp.data[0].city_name == location.value) {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `Where in ${location.value}?`
          })
          const dests = resp.data.map(({label}, i) => `${i+1}. ${label}`).join('<br>')
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg:
              `Here's a couple of destinations: ${dests}`
          })
          context.askingForDestination = true
        } else if (resp.data.length == 0) {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `Unfortunately, I couldn't find that place yet (I'm not that smart yet). Mind giving me a few more hints?`
          })
          context.location = undefined
          context.initLocation = undefined
        }
      }

      if (!wasAskingForDest && entities.datetime && entities.datetime[0]) {
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

      if (!wasAskingForDest && entities.datetime && entities.datetime[0]) {
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

      if (!context.askingForDestination && context.location && context.date && context.numOfAdults) {
        const intent = (entities.intent && entities.intent[0].value)

        if (intent == 'cheaper') {
          const cities = wrap(`https://distribution-xml.booking.com/json/bookings.autocomplete?text=${context.initLocation}&languagecode=en`, {
            dataType: 'jsonp',
            auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
          })
          console.log('cities req', context.initLocation)
          console.log('cities', cities)
          const { longitude, latitude } = cities.data[0]
          let checkin = new Date(context.date).toISOString()
          checkin = checkin.substring(0, checkin.indexOf('T'))

          let checkout = new Date(context.date)
          checkout.setDate(checkout.getDate() + 1)
          checkout = checkout.toISOString()
          checkout = checkout.substring(0, checkout.indexOf('T'))
          const url = `https://distribution-xml.booking.com/json/getHotelAvailabilityV2?output=room_policies,room_details,hotel_details&checkin=${checkin}&checkout=${checkout}&longitude=${longitude}&latitude=${latitude}&room1=${getRoom(context)}&rows=10`
          const resp = wrap(url, {
            dataType: 'jsonp',
            auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
          })
            if (resp.data.hotels.length > 0) {
              const cheap = console.log(_.sortBy(resp.data.hotels, (hotel) => hotel.price))
              console.log('cheap', cheap[0])

              //const hotel = resp.data.hotels[0]
              //Chat.insert({
                //sess_id: sessionId,
                //me: false,
                //msg: `All right found you a great hotel, {stars:${hotel.stars}} ${hotel.hotel_name}`
              //})
              //Chat.insert({
                //sess_id: sessionId,
                //me: 'hotel',
                //hotel
              //})
              //if (Hotel.find({id: hotel.id}).fetch().length <= 0) {
                //Hotel.insert({id: hotel.id, hotel})
              //}
              //Chat.insert({
                //sess_id: sessionId,
                //me: false,
                //msg: `If that's not to your liking, I can also help you find a cheaper or better rated hotel.`
              //})
            }

          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `All right found you an even cheaper hotel, ${context.hotel}`
          })
        } else if (intent == 'better') {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: `All right found you a better rated hotel, ${context.hotel}`
          })
        }
        else {
          const cities = wrap(`https://distribution-xml.booking.com/json/bookings.autocomplete?text=${context.initLocation}&languagecode=en`, {
            dataType: 'jsonp',
            auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
          })
          console.log('cities req', context.initLocation)
          console.log('cities', cities)
          const { longitude, latitude } = cities.data[0]
          if (cities.data.length <= 0) {
          } else {
            let checkin = new Date(context.date).toISOString()
            checkin = checkin.substring(0, checkin.indexOf('T'))

            let checkout = new Date(context.date)
            checkout.setDate(checkout.getDate() + 1)
            checkout = checkout.toISOString()
            checkout = checkout.substring(0, checkout.indexOf('T'))

            const url = `https://distribution-xml.booking.com/json/getHotelAvailabilityV2?output=room_policies,room_details,hotel_details&checkin=${checkin}&checkout=${checkout}&longitude=${longitude}&latitude=${latitude}&room1=${getRoom(context)}&rows=10`
            const resp = wrap(url, {
              dataType: 'jsonp',
              auth: `${process.env.BOOKING_USER}:${process.env.BOOKING_PASS}`
            })
            if (resp.data.hotels.length > 0) {
              const hotel = resp.data.hotels[0]
              Chat.insert({
                sess_id: sessionId,
                me: false,
                msg: `All right found you a great hotel, {stars:${hotel.stars}} ${hotel.hotel_name}`
              })
              Chat.insert({
                sess_id: sessionId,
                me: 'hotel',
                hotel
              })
              if (Hotel.find({id: hotel.id}).fetch().length <= 0) {
                Hotel.insert({id: hotel.id, hotel})
              }
              Chat.insert({
                sess_id: sessionId,
                me: false,
                msg: `If that's not to your liking, I can also help you find a cheaper or better rated hotel.`
              })
            } else {
              Chat.insert({
                sess_id: sessionId,
                me: false,
                msg: `Oops, looks like we couldn't find any hotels for that query`
              })
              Chat.insert({
                sess_id: sessionId,
                me: false,
                msg: `Try increasing search radius?`
              })
            }
          }
        }
      } else {
        console.log("EMPTYYYY!\n\n\n")
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
        } else if (!context.date && !context.askingForDestination) {
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: 'When do you plan on staying?'
          })
        } else if (!context.askingForDestination && !context.numOfAdults) {
          context.askingForCount = true
          Chat.insert({
            sess_id: sessionId,
            me: false,
            msg: 'For how many people are you going to book?'
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
