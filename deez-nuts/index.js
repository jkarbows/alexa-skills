// For Isaiah, with L.O.V.E. <3
'use strict'

var AlexaSkill = require('./AlexaSkill')

var APP_ID = "amzn1.echo-sdk-ams.app.[YOUR_APP_ID]"

var DeezNuts = function() {
  AlexaSkill.call(this, APP_ID)
}

DeezNuts.prototype = Object.create(AlexaSkill.prototype)
DeezNuts.prototype.constructor = DeezNuts

DeezNuts.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session) {
  console.log("DeezNuts onSessionStarted requestId: " + sessionStartedRequest.requestId
    + ", sessionId: " + session.sessionId)
}

DeezNuts.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
  console.log("HelloWorld onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId)
  var speechOutput = "Ha, got eem"
  var repromptText = " "
  response.tell(speechOutput)
  
}

DeezNuts.prototype.intentHandlers = {
    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = "Sorry"
        response.tell(speechOutput)
    }
}

exports.handler = function(event, context) {
    var deezNutsHelper = new DeezNuts()
    deezNutsHelper.execute(event, context)
}