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
  stringify (i) {
    console.log(JSON.stringify(i))
  },
  activeChat () {
    return Session.get('activeChat')
  },
  chatName () {
    if (Session.get('activeChat')) {
      return WaitingList.find({ _id: Session.get('activeChat') }).fetch()[0].header
    } else {
      return 'Broop'
    }
  },
  chat () {
    if (Session.get('activeChat')) {
      const chat = WaitingList.find({ _id: Session.get('activeChat') }).fetch()[0].chat
      return chat
    } else {
      return Chat.find({ sess_id: Session.get('sess_id') })
    }
  },
  chatTab () {
    return WaitingList.find({ user_ids: { _id: Meteor.userId(),     name: Meteor.user().profile.name      } })
  },
  shortHand (name) {
    return name.match(/\b\w/g).join('')
  },
  username (id) {
    return Meteor.users.findOne(id).profile.name
  },
  owned (id) {
    if (Meteor.user()._id == id) {
      return 'chat__msg--owned'
    } else {
      return ''
    }
  },
  chatColor(chat) {
    if (chat.sender == 'system')
      return 'chat__msg--system'
    else if (chat.sender == Meteor.userId()) {
      return 'chat__msg--me';
    }
    else if (chat.me) {
      return 'chat__msg--me';
    } else {
      return 'chat__msg';
    }
  },
});

Template.chat.events({
  'submit .chat__input-form'(e, instance) {
    e.preventDefault()
    const msg = e.target.msg.value
    e.target.msg.value = ''

    if (Session.get('activeChat')) {
      WaitingList.update(Session.get('activeChat'), { $addToSet: { chat: { sender: Meteor.userId(), msg } }})
    } else {
      Chat.insert({ sess_id: Session.get('sess_id'), me: true, msg })
      Session.set('searchData', msg)

      instance.chatLoading.set(true)
      Meteor.call('chat', Session.get('sess_id'), msg, JSON.parse(Session.get('context')), (err, context) => {
        Session.set('context', context)
        instance.chatLoading.set(false)
      })
    }
  },
  'click .chat__tabs-tab'(e, instance) {
    e.preventDefault()
    Session.set('activeChat', event.target.dataset.id)
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
  hasNotJoined: function() {
    const result = !Template.instance().userJoined.get() && Meteor.user()
    if (result) {
      document.getElementById("shareBooking").disabled = false;
      return true
    } else {
      document.getElementById("shareBooking").disabled = true;
      return false
    }
  },
  isInWaitList: function (s) {
    console.log("checking if in wait list");
    for (var i = s.user_ids.length - 1; i >= 0; i--) {
      if (s.user_ids[i]._id == Meteor.userId()) {
        Template.instance().userJoined.set(true)
        return true;
      }
    }
    Template.instance().userJoined.set(false)
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
  },
  'click .userProfile'(event) {
    event.preventDefault()
    const id = event.currentTarget.lastElementChild.value
    console.log(id)
    Session.set("id", id);
    $('#userModal').openModal();
  },
})
