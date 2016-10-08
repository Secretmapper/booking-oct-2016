import { FlowRouter } from 'meteor/kadira:flow-router';
import { BlazeLayout } from 'meteor/kadira:blaze-layout';

FlowRouter.route('/', {
	action: function(params) {
		BlazeLayout.render("mainView", {});
	},
});

FlowRouter.route('/landing', {
	action: function(params) {
		BlazeLayout.render("landing", {});
	},
});