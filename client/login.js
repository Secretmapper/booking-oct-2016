Template.login.events({
  'click .btn-facebook'(event) {
    event.preventDefault()
    Meteor.loginWithFacebook((err) => {
      if(!err) { }
    })
  },
  'click .logout'(event) {
    event.preventDefault()
    Meteor.logout((err) => {
      console.log(err)
    })
  }
})
