import { Meteor } from 'meteor/meteor';

Meteor.startup(() => {
  // code to run on server at startup
  Accounts.onCreateUser(function(options, user) {
	    //pass the surname in the options
	    if(!options.profile){
	       options.profile = {}
	    }

	    if (options && options.name) {
	    	user.profile = options.profile
	    } else {
	    	options.profile.name = "test name"
	    	user.profile = options.profile
	    }
	    
	    if (typeof(user.services.facebook) != "undefined") {
	        user.services.facebook.picture = "http://graph.facebook.com/" + user.services.facebook.id + "/picture/?type=large";
	    }

	    return user
	});
});
