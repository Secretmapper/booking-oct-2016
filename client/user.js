import './user.html';


Template.user.helpers({
	'user': function() {
		let user = Meteor.users.findOne({_id: Session.get("id")});
		if (user.services)
	    {
	        if (user.services.facebook)
	            return user.services.facebook.picture;
	        if (user.services.twitter)
	            return user.services.twitter.profile_image_url;
	        if (user.services.google)
	            return user.services.google.picture;
	    }
		return user
	},
	'userImg': function() {
		let user = Meteor.users.findOne({_id: Session.get("id")});
		if (user.services)
	    {
	        if (user.services.facebook)
	            return user.services.facebook.picture;
	        if (user.services.twitter)
	            return user.services.twitter.profile_image_url;
	        if (user.services.google)
	            return user.services.google.picture;
	    }
	    else
	    {
	        return "/img/logo.png";
	    }
	}
});
