// >bing
'use strict'

var AlexaSkill = require('./AlexaSkill')
var rp = require('request-promise')
var cheerio = require('cheerio')
var Firebase = require('firebase')
var secrets = require('./secrets')

var APP_ID = secrets.alexa

var GoogleSearch = function() {
    AlexaSkill.call(this, APP_ID)
}

GoogleSearch.prototype = Object.create(AlexaSkill.prototype)
GoogleSearch.prototype.constructor = GoogleSearch

GoogleSearch.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session) {
    console.log("GoogleSearch onSessionStarted requestId: " + sessionStartedRequest.requestId
        + ", sessionId: " + session.sessionId)
}

GoogleSearch.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
    console.log("GoogleSearch onLaunch requestId" + launchRequest.requestId + ", sessionId: " + session.sessionId)
    var speechOutput = "Welcome to Google. Please speak your search query"
    var repromptText = ""
    response.ask(speechOutput, repromptText)
}

GoogleSearch.prototype.intentHandlers = {
    "SearchIntent": function(intent, session, response) {
        var speechOutput = "Search Intent"
        var repromptText = ""
        var cardTitle = "Google"

        //make a request to google and grab the first result
        //test cheerio+request query
        var query = "alexa"

        query = intent.slots.query.value

        //parse multiword queries
        var queryString = "http://www.google.com/search?q=" + query

        var options = {
            uri: queryString,
            transform: function(body) {
                return cheerio.load(body) // pass in $ first (not html) to use jQuery/cheerio
            }
        }

        // need to parse the results in a better fashion, this is dreadful
        rp(options)
            .then(function($) {
                console.log($('#ires').children('ol').children('.g'))
                console.log($('#ires').children('ol').children('.g').children('.r').children('a'))
                console.log($('#ires').children('ol').children('.g').children('.r').children('a').text())
                console.log($('#ires').children('ol').children('.g').children('.s').children('.st'))
                console.log($('#ires').children('ol').children('.g').children('.s').children('.st').text())

                var titleOutput = $('#ires').children('ol').children('.g').children('.r').children('a').text().split('Browse')
                var description = $('#ires').children('ol').children('.g').children('.s').children('.st').text().split('.Results')

                speechOutput = titleOutput[0] + ". " + description[0]
                speechOutput += ". Is there anything else I can help you find on Google today?"
                console.log(speechOutput)
                response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
            }).catch(function(err) {
            console.log("ERRRORRRRRRRR" + err)
            speechOutput = "There was an error retrieving your query, but I've added a card with a link to"
                + " the google search in your alexa app. Is there anything else I can help you find?"
            // make a card title google with a link to the query
            response.askWithCard(speechOutput, repromptText, cardTitle, queryString)
        })
    },

    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = "go men nasai"
        response.tell(speechOutput)
    }
}

exports.handler = function(event, context) {
    var googleSearchHelper = new GoogleSearch()
    googleSearchHelper.execute(event, context)
}
