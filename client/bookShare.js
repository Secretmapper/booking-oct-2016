import { WaitingList } from '../lib/Collections.js'

import './bookShare.html';


Template.bookShare.events({
	'submit .waitListForm'(event) {
		event.preventDefault();
		const header = event.target.header.value;
		const description = event.target.description.value;

		WaitingList.insert({
	      max: 4,
	      header,
	      description,
	      user_ids: [{ _id: Meteor.userId(), name: Meteor.user().profile.name }]
	    });
	    event.target.header.value = '';
	    event.target.description.value = '';
	},
});
