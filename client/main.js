import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { BlazeLayout } from 'meteor/kadira:blaze-layout';

import { Chat, WaitingList } from '../lib/Collections.js'
import './main.html';
import uuid from 'node-uuid'

const sess_id = uuid.v4()
Session.set('sess_id', sess_id)
Session.set('context', "{}")

BlazeLayout.setRoot('body');

Template.chat.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});


Template.chat.onCreated(function () {
  this.chatLoading = new ReactiveVar(false);
})

Template.waitingList.onCreated(function () {
  this.userJoined = new ReactiveVar(false);
})

Template.chat.helpers({
  chatLoading() {
    return Template.instance().chatLoading.get();
  },
  chat: Chat.find({ sess_id: Session.get('sess_id') }),
  chatColor(chat) {
    if (chat.me) {
      return 'chat__msg--me';
    } else {
      return 'chat__msg';
    }
  },
  counter() {
    return Template.instance().counter.get();
  },
});

Template.chat.events({
  'submit .chat__input-form'(e, instance) {
    e.preventDefault()
    const msg = e.target.msg.value
    e.target.msg.value = ''

    Chat.insert({ sess_id: Session.get('sess_id'), me: true, msg })
    Session.set('searchData', msg)

    instance.chatLoading.set(true)
    Meteor.call('chat', Session.get('sess_id'), msg, JSON.parse(Session.get('context')), (err, context) => {
      console.log(context)
      Session.set('context', context)
      instance.chatLoading.set(false)
    })
  }
});

Template.property.onRendered(function () {
})

Template.property.helpers({
  imgs: [1,2,3],
})

Template.waitingList.helpers({
  slotsLeft: function (s) {
   return s.max - s.user_ids.length
  },
  hasJoined: function() {
    return Template.instance().userJoined.get()
  },
  isInWaitList: function (s) {
    for (var i = s.user_ids.length - 1; i >= 0; i--) {
      if (s.user_ids[i]._id == Meteor.userId()) {
        return true;
        Template.instance().userJoined.set(true)
      }
    }
    return false
  },
  waitingList: function() {
    let all = WaitingList.find({}).fetch()
    let chunks = []
    let size = 3;
    while (all.length > size) {
      chunks.push({ row: all.slice(0, size)});
      all = all.slice(size);
    }
    chunks.push({row: all});
    return chunks;
  }
})

Template.waitingList.events({
  'click .btn-join'(event) {
    event.preventDefault()
    const target = event.target.dataset.id
    WaitingList.update(target, {
      $addToSet: { user_ids: { _id: Meteor.userId(), name: Meteor.user().profile.name } }
    })
  }
})
