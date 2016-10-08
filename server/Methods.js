import Future from 'fibers/future'

Meteor.methods({
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
