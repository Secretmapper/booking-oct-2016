import { Template } from 'meteor/templating';
import { ReactiveVar } from 'meteor/reactive-var';

import { Chat, WaitingList } from '../lib/Collections.js'
import './main.html';

Template.chat.onCreated(function helloOnCreated() {
  // counter starts at 0
  this.counter = new ReactiveVar(0);
});

Template.chat.helpers({
  chat: Chat.find({}),
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
  'submit .chat__input-form'(e) {
    e.preventDefault()
    const msg = e.target.msg.value
    e.target.msg.value = ''
    Chat.insert({ me: true, msg })
  }
});

Template.property.onRendered(function () {
})

Template.property.helpers({
  imgs: [1,2,3]
})

Template.property.events({
  'click .book-share'(event) {
    event.preventDefault()
    WaitingList.insert({
      max: 4,
      user_ids: [{ _id: Meteor.user()._id, name: Meteor.user().profile.name }]
    })
  }
})

Template.waitingList.helpers({
  slotsLeft: function (s) {
   return s.max - s.user_ids.length
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
      $addToSet: { user_ids: { _id: Meteor.user()._id, name: Meteor.user().profile.name } }
    })
  }
})
