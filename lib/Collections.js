import { Mongo } from 'meteor/mongo';

export const Chat = new Mongo.Collection('TransientChat')
//Chat.insert({sesssme: false, msg: `Hey, I'm Broop`})
//Chat.insert({me: false, msg: `I'm here to help you get the best hotel for your trip`})

export const WaitingList = new Mongo.Collection('WaitingList')
export const Hotel = new Mongo.Collection('Hotel')
