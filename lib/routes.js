import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

FlowRouter.route('/', {
	action: function(params) {
		BlazeLayout.render("front", {});
	},
});

FlowRouter.route('/home', {
	action: function(params) {
		BlazeLayout.render("mainView", {});
	},
});

FlowRouter.route('/bookShare', {
	action: function(params) {
		BlazeLayout.render("bookShare", {});
	},
});