// Hey hey hey let's get social!
'use strict'

var AlexaSkill = require('./AlexaSkill')
var OAuth      = require('oauth')
var secrets    = require('./secrets')
var userToken = 'null'
var userSecret = 'null'

var APP_ID = secrets.alexa

var Twitter = function() {
    AlexaSkill.call(this, APP_ID)
}

Twitter.prototype = Object.create(AlexaSkill.prototype)
Twitter.prototype.constructor = Twitter

Twitter.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session, response) {
    console.log('Twitter onSessionStarted requestId:' + sessionStartedRequest.requestId
        + ', sessionId: ' + session.sessionId)
    console.log(session)
    if(session.user.accessToken) {
        var token = session.user.accessToken
        var tokens = token.split('ILOVEYOU')
        userToken = tokens[0]
        userSecret = tokens[1]
    } else {
        var speechOutput = "You must have a Twitter account to use this skill. "
            + "Please use the Alexa app to link your Amazon account with Twitter."
        response.reject(speechOutput)
    }
}

Twitter.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
    console.log('Twitter onLaunch requestId' + launchRequest.requestId + ', sessionId: ' + session.sessionId)
    var speechOutput = "Welcome to Twitter. You can ask me to tweet for you, or see what's new by asking "
        + "for your timeline."
    var cardTitle = "Twitter"
    var repromptText = "I can also do a number of other things. Say \"Help\" for a full list of my functions, "
        + "or you can check out the card I added to your alexa app for a couple of examples."
    var cardText = "Here are some things you can ask me to do for you:\n\n"
        + "Tweet 'something'\n\n"
        + "Get Home Timeline\n\n"
        + "Search 'something'\n\n"
        + "Read me my tweets\n\n"
    response.askWithCard(speechOutput, repromptText, cardTitle, cardText)
}

Twitter.prototype.intentHandlers = {
    "PostStatusIntent": function(intent, session, response) {
        session.attributes.lastIntent = "PostStatusIntent"
        session.attributes.timeline = "false"

        if(!intent.slots.input.value) {
            var speechOutput = "What would you like me to tweet?"
            var repromptText = "Just say whatever you'd like me to tweet, or ask me to do something else."
            response.ask(speechOutput, repromptText)
        } else {
            // prevent InputIntent from retriggering following oneshot tweet
            session.attributes.lastIntent = "InputIntent"

            postNewStatus(intent, session, response)
        }
    },
    "PostReplyIntent": function(intent, session, response) {
        var speechOutput = ""
        var repromptText = ""
        var id = null

        if(session.attributes.timeline === "true") {
            session.attributes.lastIntent = "PostReplyIntent"

            if(intent.slots.position.value) {
                id = intent.slots.position.value
                session = parseOrdinal(id, session)
                id = session.attributes.tweet

                if(id) {
                    // mark flag to control InputIntent behavior
                    session.attributes.timeline = "false"
                    speechOutput = "What do you want to say to @" + session.attributes.tweetUser + "?"
                } else {
                    speechOutput = "Sorry, I didn't get that. Which tweet are you trying to reply to? "
                        + "Say 'the first one' or 'that second girl' or even just 'third' or 'fourth'"
                }
                response.ask(speechOutput, repromptText)
            } else {
                speechOutput = "Which person did you want me to reply to?"
            }
            response.ask(speechOutput, repromptText)
        } else {
            speechOutput = "Sorry, I can only reply to people from a timeline. Try asking for your home "
                + "timeline or your mentions by saying 'get my home timeline' or asking ' who's been talking to me? "
                + "Or, you can ask for help at any time by saying 'help'"
            response.ask(speechOutput, repromptText)
        }
    },
    "RetweetStatusIntent": function(intent, session, response) {

        var speechOutput = ""
        var repromptText = ""
        var id = null

        console.log(intent)
        console.log(session)

        if(session.attributes.lastIntent === "GetUserTimelineIntent") {
            speechOutput = "Sorry, you can't retweet your own tweets. I get it, sometimes I wish I could, too. "
                + "Not to toot my own horn, but I have some pretty good tweets sometimes. "
                + "Anyway, is there anything else you want to do on twitter right now?"
            response.ask(speechOutput, repromptText)
        }
        if(session.attributes.timeline === "true") {
            session.attributes.lastIntent = "RetweetStatusIntent"

            if(intent.slots.position.value) {
                // remove timeline flag to direct behavior of AMAZON.CancelIntent
                session.attributes.timeline = "false"
                // parse intent.slots.position ordinal number into index
                id = intent.slots.position.value
                session = parseOrdinal(id, session)
                id = session.attributes.tweet

                if (!id) {
                    speechOutput = "I'm sorry, which status would you like me to retweet, again?"
                    response.ask(speechOutput, repromptText)
                }
                retweetStatus(id, session, response)
            } else {
                speechOutput = "Which status would you like me to retweet?"
                response.ask(speechOutput, repromptText)
            }
        } else {
            speechOutput = "Sorry, I couldn't find a status for you to retweet. "
                + "Is there anything else on twitter I can help you with?"
            response.ask(speechOutput, repromptText)
        }
    },
    "FavoriteStatusIntent": function(intent, session, response) {
        var speechOutput = ""
        var repromptText = ""
        var id = null

        console.log(intent)
        console.log(session)

        if(session.attributes.timeline === "true") {
            session.attributes.lastIntent = "FavoriteStatusIntent"

            if(intent.slots.position.value) {
                session.attributes.timeline = "false"

                id = intent.slots.position.value
                session = parseOrdinal(id, session)
                id = session.attributes.tweet

                if(!id) {
                    speechOutput = "Which status would you like me to favorite?"
                    response.ask(speechOutput, repromptText)
                }
                favoriteStatus(id, session, response)
            } else {
                speechOutput = "Which status would you like me to favorite?"
                response.ask(speechOutput, repromptText)
            }
        } else {
            speechOutput = "Sorry, I couldn't find a status for you to favorite. "
                + "Is there anything else you want to do on Twitter?"
            response.ask(speechOutput, repromptText)
        }
    },
    "FollowUserIntent": function(intent, session, response) {

        var speechOutput = "Which person do you want me to follow?"
        var repromptText = "Use ordinal numbers."
        var id = null

        if(session.attributes.timeline === "true") {
            session.attributes.lastIntent = "FollowUserIntent"

            if(session.attributes.lastIntent === "GetUserIntent") {
                // if on another users timeline just validate the follow
                getUser(session.attributes.tweetUser, response, function(data) {
                    followUser(data, response)
                })
            } else {
                if(intent.slots.position.value) {
                    session.attributes.timeline = "false"

                    id = intent.slots.position.value
                    session = parseOrdinal(id, session)

                    getStatus(session.attributes.tweet, response, function(data) {
                        validateFollow(data, session, response)
                    })
                } else {
                    response.ask(speechOutput, repromptText)
                }
            }
        } else {
            speechOutput = "Sorry, I can only follow users from a timeline. Try asking me to search something "
                + "if you're looking for users to follow. Is there anything else I can help you with?"
            response.ask(speechOutput, repromptText)
        }
    },
    "UnfollowUserIntent": function(intent, session, response) {
        var speechOutput = ""
        var repromptText = ""
        var id = null

        if(session.attributes.lastIntent === "FollowUserIntent") {
            // pretend "unfollow" after a FollowIntent triggers AMAZON.CancelIntent
            session.attributes.lastIntent = "AMAZON.CancelIntent"

            unfollowUser(session, response)
        } else if(session.attributes.timeline === "true") {
            if(session.attributes.lastIntent === "GetUserTimeline") {
                speechOutput = "Sorry, I can only unfollow people from your home timeline or your mentions timeline. "
                    + "You can ask for these by saying 'get my home timeline' or ' who's been talking to me?' "
                    + "Or, you can ask for help at any time by saying 'help'"
                response.ask(speechOutput, repromptText)
            } else {
                session.attributes.lastIntent = "UnfollowUserIntent"

                if(intent.slots.position.value) {
                    id = intent.slots.position.value
                    session = parseOrdinal(id, session)
                    id = session.attributes.tweet
                    // should probably check if you're already following them or not first
                    // nope instead we'll just restrict it to your home tl and mentions and hope that you follow dem
                    if(id) {
                        speechOutput = "Are you sure you want me to unfollow " + session.attributes.tweetUser + "?"
                    } else {
                        speechOutput = "Sorry, who are you trying to unfollow? Say 'the first person' or 'that second one' " +
                            "or even just 'third'"
                    }
                    response.ask(speechOutput, repromptText)
                } else {
                    speechOutput = "Which person do you want me to unfollow?"
                }

                response.ask(speechOutput, repromptText)
            }
        } else {
            speechOutput = "Sorry, I can only unfollow people for you from a timeline. Try asking for your home "
                + "timeline or your mentions by saying 'get my home timeline' or asking 'who's been talking to me?' "
                + "Or, you can ask for help at any time by saying 'help'"
            response.ask(speechOutput, repromptText)
        }
    },
    "GetHomeTimelineIntent": function(intent, session, response) {
        session.attributes.lastIntent = "GetHomeTimelineIntent"
        session.attributes.timeline = "true"
        // mark as null in timeline fetching intents so 'follow/rt/fav him/reply to him' will ask who you meant
        session.attributes.tweet = null
        session.attributes.tweetUser = null

        var speechOutput = "Here's your home timeline: "
        var repromptText = "Say 'Yes' to hear more from your timeline. Or, speak a different command for Twitter."
        var cardTitle = "Home Timeline"
        var cardText = ""
        var url = 'https://api.twitter.com/1.1/statuses/home_timeline.json?count=5'

        getTimeline(url, response, function(data) {
            speechOutput += parseTimeline(data, session)
            cardText = speechOutput
            speechOutput += "\n\nWould you like to hear more?"

            response.askWithCard(speechOutput, repromptText, cardTitle, cardText)
        })
    },
    "GetUserTimelineIntent": function(intent, session, response) {
        session.attributes.lastIntent = "GetUserTimelineIntent"
        session.attributes.timeline = "true"
        session.attributes.tweet = null
        session.attributes.tweetUser = null

        var speechOutput = "Here's what you've been saying recently: "
        var repromptText = ""
        var cardTitle = "Your Tweets"
        var url = 'https://api.twitter.com/1.1/statuses/user_timeline.json?count=30'

        getTimeline(url, response, function(data) {
            speechOutput += parseTimeline(data, session)
            speechOutput += "\n\nIs there anything else I can do for you?"

            response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
        })
    },
    "GetMentionsTimelineIntent": function(intent, session, response) {
        session.attributes.lastIntent = "GetMentionsTimelineIntent"
        session.attributes.timeline = "true"
        session.attributes.tweet = null
        session.attributes.tweetUser = null

        var speechOutput = "I've pulled up some recent tweets mentioning you: "
        var repromptText = ""
        var cardTitle = "Your Mentions"
        var url = "https://api.twitter.com/1.1/statuses/mentions_timeline.json?count=7"

        getTimeline(url, response, function(data) {
            speechOutput += parseTimeline(data, session)
            speechOutput += "\n\nWould you like to hear more?"

            response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
        })
    },
    "GetSearchIntent": function(intent, session, response) {
        session.attributes.lastIntent = "GetSearchIntent"
        session.attributes.timeline = "true"
        session.attributes.search = null
        session.attributes.tweet = null
        session.attributes.tweetUser = null

        if(!intent.slots.input.value) {
            var speechOutput = "What would you like to search for on Twitter?"
            var repromptText = "Speak your search query and I'll pull up relevant tweets. "
                + "Or, you can say a different command for Twitter."
            response.ask(speechOutput, repromptText)
        } else {
            session.attributes.search = intent.slots.input.value
            getSearch(intent, session, response)
        }
    },
    // probably should have named this WhoisIntent to reduce ambiguity btwn GetUser and GetUserTimeline intents
    "GetUserIntent": function(intent, session, response) {
        session.attributes.lastIntent = "GetUserIntent"

        var speechOutput = ""
        var repromptText = ""
        var cardTitle = "@"
        var url = "https://api.twitter.com/1.1/statuses/user_timeline.json?screen_name="
        var id = null

        // maybe check if there's already a tweetUser/tweet to pull from if you just rted or something?
        // set session.attributes.tweetUser to dis mofo right hurr
        if(session.attributes.timeline === "true") {
            if(intent.slots.position.value) {
                // whoops unlike all of our other id intents this one fetches a timeline so false is wrong
                // session.attributes.timeline = "false"

                id = intent.slots.position.value
                session = parseOrdinal(id, session)

                url += session.attributes.tweetUser

                getUser(session.attributes.tweetUser, response, function(data) {
                    speechOutput += data.name + " (@" + data.screen_name + ")"
                    if(data.description) {
                        speechOutput += ", '" + data.description + "',"
                    }
                    speechOutput += " has tweeted " + data.statuses_count + " times, follows "
                        + data.friends_count + " people, and is followed by " + data.followers_count
                        + " people.\n\nHere's the timeline for @" + data.screen_name

                    getTimeline(url, response, function(data) {
                        speechOutput += parseTimeline(data, session)
                        cardTitle += session.attributes.tweetUser

                        response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
                    })
                })
            } else {
                speechOutput = "Sorry, who did you mean? Try asking with a description like 'the first person', "
                    + "or 'the second guy' or even just 'third'. Or, say 'help' at any time for assistance."
                response.ask(speechOutput, repromptText)
            }
        } else {
            speechOutput = "Sorry"
            response.ask(speechOutput, repromptText)
        }
    },
    "InputIntent": function(intent, session, response) {
        console.log(session.attributes)

        var speechOutput = "Sorry, I didn't quite catch that. I'll try to listen harder next time. "
            + "While I'm working that out with our engineers, is there anything else you want to do on Twitter?"
        var repromptText = ""

        if(session.attributes.lastIntent === "PostStatusIntent") {
            session.attributes.lastIntent = "InputIntent"
            postNewStatus(intent, session, response)
        } else if(session.attributes.lastIntent === "PostReplyIntent") {
            session.attributes.lastIntent = "InputIntent"
            if(session.attributes.timeline === "true") {
                speechOutput = "Which tweet are you trying to reply to? Use words like 'first', 'second', and "
                    + "'third' to describe them relative to the timeline I listed out."
                response.ask(speechOutput, repromptText)
            }
            postReplyStatus(intent, session, response)
        } else if(session.attributes.timeline === "true") {
            if(session.attributes.lastIntent === "GetSearchIntent" && !session.attributes.search) {
                session.attributes.search = intent.slots.input.value
                getSearch(intent, session, response)
            } else {
                response.ask(speechOutput, repromptText)
            }
        } else {
            response.ask(speechOutput, repromptText)
        }
    },
    "PositionIntent": function(intent, session, response) {
        console.log(session)

        var speechOutput = "Sorry, I couldn't figure out what you wanted me to do. "
            + "Is there anything else you want to do on twitter?"
        var repromptText = ""
        var id = null

        if(session.attributes.timeline === "true") {
            if(!intent.slots.position.value) {
                response.ask(speechOutput, repromptText)
            } else {
                session.attributes.timeline = "false"

                id = intent.slots.position.value
                session = parseOrdinal(id, session)
                id = session.attributes.tweet

                if(!id) {
                    speechOutput = "Which status would you like me to favorite?"
                    response.ask(speechOutput, repromptText)
                }
                // make request
                if (session.attributes.lastIntent === "PostReplyIntent") {
                    speechOutput = "What do you want to say to @" + session.attributes.tweetUser + "?"
                    response.ask(speechOutput, repromptText)
                }
                else if(session.attributes.lastIntent === "RetweetStatusIntent") {
                    retweetStatus(id, session, response)
                } else if(session.attributes.lastIntent === "FavoriteStatusIntent") {
                    favoriteStatus(id, session, response)
                } else if(session.attributes.lastIntent === "FollowUserIntent") {
                    getStatus(id, response, function(data) {
                        validateFollow(data, session, response)
                    })
                } else if(session.attributes.lastIntent === "UnfollowUserIntent") {
                    // should probably check if you're already following them or not first
                    speechOutput = "Are you sure you want me to unfollow " + session.attributes.tweetUser + "?"
                    response.ask(speechOutput, repromptText)
                } else {
                    response.ask(speechOutput, repromptText)
                }
            }
        } else {
            response.ask(speechOutput, repromptText)
        }
    },
    "PrivacyPolicyIntent": function(intent, session, response) {
        getPrivacyPolicy(response)
    },
    "TermsIntent": function(intent, session, response) {
        getTermsOfService(response)
    },
    "AMAZON.YesIntent": function(intent, session, response) {
        var speechOutput = ""
        var repromptText = ""
        var cardTitle = ""
        var cardText = ""

        console.log(session.attributes)
        if(session.attributes.timeline === "true") {
            speechOutput = "More: "
            // build url for next step in whichever timeline type we're in
            var url = "https://api.twitter.com/1.1/statuses/"

            if(session.attributes.lastIntent === "UnfollowUserIntent") {
                session.attributes.timeline = "false"
                // confirmed unfollow
                unfollowUser(session, response)
            } else {
                if(session.attributes.lastIntent === "GetHomeTimelineIntent") {
                    url += "home_timeline.json?"
                } else if(session.attributes.lastIntent === "GetUserTimelineIntent"
                        || session.attributes.lastIntent === "GetUserIntent") {
                    url += "user_timeline.json?"
                    if(session.attributes.lastIntent === "GetUserIntent") {
                        url += "screen_name=" + session.attributes.tweetUser + "&"
                    }
                } else if(session.attributes.lastIntent === "GetMentionsTimelineIntent") {
                    url += "mentions_timeline.json?"
                } else if(session.attributes.lastIntent === "GetSearchIntent") {
                    url = "https://api.twitter.com/1.1/search/tweets.json?q=" + session.attributes.search + "&"
                }
                // used to be 'count=5&max_id=', moved limit on count to parseTimeline
                url += 'max_id=' + session.attributes.lastStatus
                getTimeline(url, response, function(data) {
                    if(session.attributes.lastIntent === "GetSearchIntent") {
                        speechOutput += parseTimeline(data.statuses, session)
                    } else {
                        speechOutput += parseTimeline(data, session)
                    }
                    speechOutput += "\n\nWould you like to hear more?"
                    response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
                })
            }
        } else  {
            speechOutput = "I couldn't figure out what you wanted me to do, sorry. Anyfin else on twitter bruv?"
            response.ask(speechOutput, repromptText)
        }
    },
    "AMAZON.NoIntent": function(intent, session, response) {
        var speechOutput = "Goodbye, have a great day!"
        response.tell(speechOutput)
    },
    "AMAZON.StartOverIntent": function(intent, session, response) {
        //clear speech attributes
        session.attributes = {}

        var speechOutput = "New twitter, who dis"
        var repromptText = ""

        response.ask(speechOutput, repromptText)
    },
    "AMAZON.RepeatIntent": function(intent, session, response) {
        var speechOutput = ""

        if(!session.attributes || !session.attributes.lastOutput) {
            speechOutput = "I'm sorry, there's nothing for me to repeat to you."
            response.tell(speechOutput)
        } else {
            speechOutput = "Sure. " + session.attributes.lastOutput
            response.tell(speechOutput)
        }
    },
    "AMAZON.HelpIntent": function(intent, session, response) {
        session.attributes.lastIntent = 'HelpIntent'
        var speechOutput = "Welcome to Twitter. I can interact with twitter for you in a variety of ways. "
            + "I can check your timeline, post new tweets for you, search on Twitter, retweet statuses, "
            + "and more. What can I help you with?"
        var repromptText = "Speak a command to get started, or look at the card I added to your Alexa app "
            + "for more information. What would you like me to do for you on Twitter?"
        var cardTitle = "Help"
        var cardText = 'Tweet by saying "tweet" and whatever you\'d like to tweet\n\n'
            + 'Reply by saying "reply" and which tweet you\'d like to reply to'
            + 'Retweet by saying "retweet" and which tweet you\'d like to retweet'
            + 'Favorite by saying "favorite" or "like" and which tweet you\'d like to favorite'
            + 'Follow users by saying "follow" and which tweet you\'d like to follow the author of'
            + 'Unfollow users by saying "unfollow" and which tweet you\'d like to unfollow the author of'
            + 'Look up users by saying "who is" and which tweet you\'d like to look up the author of. From here you can just say "follow" or "follow them" to follow the user.'
            + 'Get your home timeline by saying "get my home timeline" or just "home"'
            + 'Get your mentions by saying "get my mentions" or "who\'s been talking to me" or even just "mentions"'
            + 'Get your own recent tweets by saying "get my tweets" or "what have I been saying" or just "me"'
            + 'Search Twitter by saying "search" and whatever you\'d like to search'
            + 'Undo your previous action by saying "undo" or "cancel"'
        response.askWithCard(speechOutput, repromptText)
    },
    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = "Okay, talk to you later."
        response.tell(speechOutput)
    },
    "AMAZON.CancelIntent": function(intent, session, response) {
        var speechOutput = " "
        var repromptText = ""
        var url = ""
        console.log(session)

        if(session.attributes.lastIntent) {
            if(session.attributes.lastIntent === "PostStatusIntent"
                || session.attributes.lastIntent === "PostReplyIntent"
                || session.attributes.lastIntent === "InputIntent") {
                // remove tweet
                destroyStatus(session, response)
            } else if(session.attributes.lastIntent === "RetweetStatusIntent") {
                // unretweet
                url = 'https://api.twitter.com/1.1/statuses/unretweet/' + session.attributes.tweet + '.json'
                postStatus(url, response, function(data, res) {
                    speechOutput = "Okay, I removed the retweet. Is there anything else I can do for you?"
                    response.ask(speechOutput, repromptText)
                })
            } else if(session.attributes.lastIntent === "FavoriteStatusIntent") {
                // unfavorite
                url = 'https://api.twitter.com/1.1/favorites/destroy.json?id=' + session.attributes.tweet
                postStatus(url, response, function(data, res) {
                    var c = Math.random() * 100
                    speechOutput = "Okay, I unliked that. Is there anything else I can do for you?"
                    if(c > 88) {
                        speechOutput = "Okay, I unfavorited that. Is there anything else I can do for you?"
                    }
                    response.ask(speechOutput, repromptText)
                })
            } else if(session.attributes.lastIntent === "FollowUserIntent") {
                // unfollow
                unfollowUser(session, response)
            } else if(session.attributes.lastIntent === "UnfollowUserIntent") {
                // need to make sure user confirmed the unfollow so this isn't redundant
                // refollow
                url = 'https://api.twitter.com/1.1/friendships/create.json?screen_name=' + session.attributes.tweetUser
                postStatus(url, response, function(data, res) {
                    speechOutput = "Okay, I refollowed " + "@" + session.attributes.tweetUser
                        + " for you. I'm glad you repaired your friendship so quickly. "
                        + "Is there anything else I can help you with on twitter today?"
                    var cardTitle = "You re-followed @" + session.attributes.tweetUser
                    var cardText = speechOutput + "" // unfollowed user information when getUser exists
                    response.askWithCard(speechOutput, repromptText, cardTitle, cardText)
                })
            } else if(session.attributes.timeline === "true") {
                // session.attributes.timeline can often be true even if it isn't
                if(!session.attributes.lastIntent === "GetUserTimelineIntent") {
                    speechOutput = "Sorry, I can only delete your tweets for you if you're browsing your own "
                        + "timeline. Say 'me' or 'what have I been saying recently' to get your timeline."
                    repromptText = "Is there anything else you'd like to do on Twitter today?"
                    response.ask(speechOutput, repromptText)
                } else {
                    // delete chosen tweet off user timeline
                    destroyStatus(session, response)
                }
            } else if(session.attributes.lastIntent === "AMAZON.CancelIntent") {
                speechOutput = "Sorry, my memory isn't so good, I can't undo something that's been undone. You'll"
                    + "have to retry your request from the beginning. Say 'help' for an explanation of what I can do"
                response.ask(speechOutput, repromptText)
            } else {
                response.tell(speechOutput, repromptText)
            }
        } else {
            response.tell(speechOutput, repromptText)
        }
    }
}

// pass in api url and body to post
function postStatus(url, response, callback) {
    var oauth = oauthInit()
    var body = null

    oauth.post(
        url,
        userToken,
        userSecret,
        body,
        // error, data, response
        function(err, data, res) {
            var speechOutput = ""
            var repromptText = ""

            if(err) {
                console.log(err)
                var error = JSON.parse(err.data)
                console.log(error)
                // tweet not found/doesn't exist/stored improperly(hopefully not)
                if(error.errors[0].code === '34') {
                    speechOutput = "Sorry, I couldn't find the tweet you were looking for. Is there something else I can help you with?"
                    response.ask(speechOutput, repromptText)
                }
                // commented out because successful unfollow requests still throw an authentication error
                // wtf twitter
                /*if(error.errors[0].code === '32') {
                    speechOutput = "There was a problem authenticating with twitter."
                    response.tell(speechOutput)
                }*/
                // other errors
                speechOutput = "Sorry, there was an error communicating with Twitter."
                response.tell(speechOutput)
            }
            data = JSON.parse(data)
            console.log(data)

            callback(data, res)
        }
    )
}

// switch to just (intent, callback) and move functionality?
function postNewStatus(intent, session, response) {
    var speechOutput = "Okay, I tweeted: "
    var repromptText = ""
    var cardTitle = "New Tweet"
    var input = intent.slots.input.value
    // build url from intent slots, replace hashtags with percent encoded chars for url
    input = replaceHashtags(input, 'hashtag ', '%23')
    input = replaceHashtags(input, 'hash tag ', '%23')
    var url = 'https://api.twitter.com/1.1/statuses/update.json?status=' + input
    // need to sanitize/format tweet input and append #AlexaTwitter
    speechOutput += "\"" + input + "for you. Is there anything else you want to do on Twitter?"
    speechOutput = replaceHashtags(speechOutput, '%23', '#')

    postStatus(url, response, function (data, res) {
        // store id of tweet in session so user can cancel
        session.attributes.tweet = data.id_str
        console.log(data)

        response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
    })
}

function postReplyStatus(intent, session, response) {
    var speechOutput = "Okay, I replied to " + "@" + session.attributes.tweetUser + " with: "
    var repromptText = ""
    var cardTitle = "Reply to @" + session.attributes.tweetUser
    //build url from intent slots and stored message id
    var url = "https://api.twitter.com/1.1/statuses/update.json?status=%40" + session.attributes.tweetUser
        + " " + intent.slots.input.value + "&in_reply_to_status_id=" + session.attributes.tweet
    console.log(url)
    speechOutput += "\"" + intent.slots.input.value + "\""

    postStatus(url, response, function (data, res) {
        session.attributes.tweet = data.id_str
        console.log(data)

        response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
    })
}

function retweetStatus(id, session, response) {
    var speechOutput = "Okay, I retweeted: "
    var repromptText = ""
    var cardTitle = "Retweeted "
    var cardText = ""

    var url = 'https://api.twitter.com/1.1/statuses/retweet/' + id + '.json'
    console.log(url)
    postStatus(url, response, function (data, res) {
        session.attributes.tweet = data.id_str
        speechOutput += data.text
        cardText = speechOutput
        speechOutput += " for you. Would you like to keep using Twitter?"
        cardTitle += data.retweeted_status.user.screen_name
        response.askWithCard(speechOutput, repromptText, cardTitle, cardText)
    })
}

// follows proper user within a timeline
function validateFollow(data, session, response) {
    if(data.retweeted_status){
        getUser(data.retweeted_status.user.screen_name, response, function(data) {
            followUser(data, response)
        })
    } else {
        getUser(session.attributes.tweetUser, response, function(data) {
            followUser(data, response)
        })
    }
}

function followUser(data, response) {
    var speechOutput = ""
    var repromptText = ""
    var cardTitle = "Followed "
    var url = "https://api.twitter.com/1.1/friendships/create.json?screen_name=" + data.screen_name

    if(data.following === "true") {
        speechOutput = "You're already following @" + data.screen_name
            + ". Is there anything else I can do for you?"
        response.ask(speechOutput, repromptText)
    } else {
        postStatus(url, response, function(data) {
            speechOutput += "Okay, I followed " + data.name + " (@" + data.screen_name
                + ") for you. Is there anything else I can do for you today?"
            cardTitle += data.name + " (@" + data.screen_name + ")"
            response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
        })
    }
}

function unfollowUser(session, response) {
    var speechOutput = ""
    var repromptText = ""
    var cardTitle = ""
    var cardText = ""
    var url = 'https://api.twitter.com/1.1/friendships/destroy.json?screen_name=' + session.attributes.tweetUser

    postStatus(url, response, function(data, res) {
        console.log(data)

        speechOutput = "Okay, I unfollowed @" + session.attributes.tweetUser + " for you. "
            + "Is there anything else on twitter I can help you with today?"
        cardTitle = "You unfollowed @" + session.attributes.tweetUser
        cardText = speechOutput + "" // get unfollowed user information for card

        response.askWithCard(speechOutput, repromptText, cardTitle, cardText)
    })
}

function favoriteStatus(id, session, response) {
    var speechOutput = "Okay, I favorited '"
    var repromptText = ""
    var cardTitle = "Favorited "
    var cardText = ""

    var url = 'https://api.twitter.com/1.1/favorites/create.json?id=' + id
    console.log(url)
    postStatus(url, response, function(data, res) {
        session.attributes.tweet = data.id_str
        speechOutput += data.text
        cardText = speechOutput
        speechOutput += "' for you. Anything else you'd like to do on twitter?"
        cardTitle += data.user.name + " (@" + data.user.screen_name + ")"
        response.askWithCard(speechOutput, repromptText, cardTitle, cardText)
    })
}

function destroyStatus(session, response) {
    var speechOutput = ""
    var repromptText = ""
    console.log(session)
    var url = 'https://api.twitter.com/1.1/statuses/destroy/' + session.attributes.tweet + '.json'
    postStatus(url, response, function(data, res) {
        speechOutput = "Okay, I deleted that tweet for you. Is there anything else on Twitter I can help you with?"
        response.ask(speechOutput, repromptText)
    })
}

// pass in api url to retrieve timeline from
function getTimeline(url, response, callback) {
    var oauth = oauthInit()

    oauth.get(
        url,
        userToken,
        userSecret,
        // error, data, response
        function(err, data, res) {
            if(err) {
                console.log(err)
                var error = JSON.parse(err.data)
                // rate limit exceeded
                if(error.errors[0].code === '88') {
                    speechOutput = "Sorry, you've hit the cap on Twitter's fifteen minute rate limit "
                        + "on requests. There's not way for me to get around this right now, so you'll just have "
                        + "to wait a bit before you try to use that command again."
                    response.tell(speechOutput)
                }
                if(error.errors[0].code === '32') {
                    speechOutput = "There was a problem authenticating with Twitter. Make sure your account is linked "
                      + "through the alexa app."
                    response.tell(speechOutput)
                }
                var speechOutput = "Sorry, there was a problem communicating with Twitter."
                response.tell(speechOutput)
            }
            data = JSON.parse(data)
            console.log(data)

            callback(data)
        }
    )
}

function getSearch(intent, session, response) {
    session.attributes.search = intent.slots.input.value
    var speechOutput = "Search results for '" + session.attributes.search + "':"
    var repromptText = ""
    var cardTitle = speechOutput
    var url = 'https://api.twitter.com/1.1/search/tweets.json?q=' + session.attributes.search + '&count=5'
    // restrict results to English for better speech output
    url += '&lang=en'

    getTimeline(url, response, function(data) {
        data = data.statuses
        console.log(data)
        speechOutput += parseTimeline(data, session)
        response.askWithCard(speechOutput, repromptText, cardTitle, speechOutput)
    })
}

function getStatus(id, response, callback) {
    var url = "https://api.twitter.com/1.1/statuses/show.json?id=" + id

    getTimeline(url, response, function(data) {
        callback(data)
    })
}

function getUser(name, response, callback) {
    var url = "https://api.twitter.com/1.1/users/show.json?screen_name=" + name

    getTimeline(url, response, function(data) {
        callback(data)
    })
}

function getPrivacyPolicy(response) {
    getTimeline('https://api.twitter.com/1.1/help/privacy.json', response, function(data) {
        var speechOutput = data.privacy
        var cardTitle = "Official Twitter Privacy Policy"
        response.tellWithCard(speechOutput, cardTitle, speechOutput)
    })
}

function getTermsOfService(response) {
    getTimeline('https://api.twitter.com/1.1/help/tos.json', response, function(data) {
        var speechOutput = data.tos
        var cardTitle = "Official Twitter Terms of Service"
        response.tellWithCard(speechOutput, cardTitle, speechOutput)
    })
}

// store returned tweet ids for retweeting/favoriting/responding
// there has to be a better way to do this
function registerAttributes(data, session) {
    if(Array.isArray(data)) {
        session.attributes.firstStatus = data[0].id_str
        session.attributes.firstUsername = data[0].user.screen_name
        session.attributes.secondStatus = data[1].id_str
        session.attributes.secondUsername = data[1].user.screen_name
        session.attributes.thirdStatus = data[2].id_str
        session.attributes.thirdUsername = data [2].user.screen_name
        session.attributes.fourthStatus = data[3].id_str
        session.attributes.fourthUsername = data[3].user.screen_name
        session.attributes.lastStatus = data[4].id_str
        session.attributes.lastUsername = data[4].user.screen_name
    }
}

function parseStatus(data) {
    // decided against "you" for user timeline
    // add relative timestamp, "three minutes ago, foo (@bitchtits) tweeted:
    // make sure dashes (quotes, whatever) aren't getting interpreted as hyphens and shortening responses
    var output = "\n\n" + data.user.name + " (@" + data.user.screen_name
    // need to strip links from tweet text, read out titles and pictures
    if(data.in_reply_to_status_id){
        output += ") replied to @" + data.in_reply_to_screen_name + ", saying: " + data.text
    } else if(data.retweeted_status) {
        // strip data from retweeted_status.text
        output += ") retweeted"
        if(data.is_quote_status) {
            output += ": " + data.retweeted_status.user.name
                + " (@" + data.retweeted_status.user.screen_name + ") quoted: "
                + data.retweeted_status.quoted_status.user.name + " (@"
                + data.retweeted_status.quoted_status.user.screen_name + "): "
                + data.retweeted_status.quoted_status.text + "\nSaying: "
                + data.retweeted_status.text
        } else {
            output += " " + data.retweeted_status.user.name
            + " (@" + data.retweeted_status.user.screen_name + "): " + data.retweeted_status.text
        }
    } else if(data.is_quote_status) {
        output += ") quoted " + data.quoted_status.user.name + " (@"
            + data.quoted_status.user.screen_name + "): " + data.text
    } else {
        output += ") tweeted: " + data.text + "\n"
    }
    return output
}

function parseTimeline(data, session) {
    var output = ""
    // limit output to five instead of full array length
    for(var i = 0; i < 5; i++) {
        output += parseStatus(data[i])
        //console.log(data[i])
    }

    registerAttributes(data, session)
    return output
}

function parseOrdinal(id, session) {
    switch (id) {
        case "1st":
            id = session.attributes.firstStatus
            session.attributes.tweetUser = session.attributes.firstUsername
            break
        case "2nd":
            id = session.attributes.secondStatus
            session.attributes.tweetUser = session.attributes.secondUsername
            break
        case "second":
            id = session.attributes.secondStatus
            session.attributes.tweetUser = session.attributes.secondUsername
            break
        case "3rd":
            id = session.attributes.thirdStatus
            session.attributes.tweetUser = session.attributes.thirdUsername
            break
        case "4th":
            id = session.attributes.fourthStatus
            session.attributes.tweetUser = session.attributes.fourthUsername
            break
        case "5th":
            id = session.attributes.lastStatus
            session.attributes.tweetUser = session.attributes.lastUsername
            break
        case "last":
            id = session.attributes.lastStatus
            session.attributes.tweetUser = session.attributes.lastUsername
            break
        default:
            console.log("Invalid position index value")
            id = null
    }
    session.attributes.tweet = id
    return session
}

function oauthInit() {
    return new OAuth.OAuth(
        'https://api.twitter.com/oauth/request_token',
        'https://api.twitter.com/oauth/access_token',
        secrets.twitter.consumer.public,
        secrets.twitter.consumer.secret,
        '1.0A',
        null,
        'HMAC-SHA1'
    )
}

// replaceAll function from stackoverflow
function replaceHashtags(str, find, replace) {
    return str.replace(new RegExp(find, 'g'), replace);
}

exports.handler = function(event, context) {
    var twitterHelper = new Twitter()
    twitterHelper.execute(event, context)
}
