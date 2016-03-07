// >bing
'use strict'

var AlexaSkill = require('./AlexaSkill')
var https = require('https')
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
    var speechOutput = "Welcome to Google, please speak your search query"
    //response.tell(speechOutput)

    //make a request to google and grab the first result
    //test cheerio+request query
    var query = "alexa"
    var queryString = "http://www.google.com/search?q=" + query

    var options = {
        uri: queryString,
        transform: function(body) {
            return cheerio.load(body) // pass in $ first (not html) to use jQuery/cheerio
        }
    }

    rp(options)
        .then(function($) {
            console.log($('#ires').children('ol').children('.g'))
            console.log($('#ires').children('ol').children('.g').children('.r').children('a'))
            console.log($('#ires').children('ol').children('.g').children('.r').children('a').text())
            console.log($('#ires').children('ol').children('.g').children('.s').children('.st'))
            console.log($('#ires').children('ol').children('.g').children('.s').children('.st').text())
            speechOutput = $('#ires').children('ol').children('.g').children('.r').children('a').text()
            console.log(speechOutput)
            response.tell(speechOutput)
        }).catch(function(err) {
            console.log("ERRRORRRRRRRR" + err)
            speechOutput = "There was an error retrieving your query"
            // make a card title google with a link to the query
            response.tell(speechOutput)
    })


}

GoogleSearch.prototype.intentHandlers = {
    "SearchIntent": function(intent, session, response) {
        var speechOutput = "Search Intent"
        response.tell(speechOutput)
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