// quick joke skill 3/193407295863
// "Alexa, tell me I'm pretty"
'use strict'

function AlexaSkill(appId) {
    this._appId = appId;
}

AlexaSkill.speechOutputType = {
    PLAIN_TEXT: 'PlainText',
    SSML: 'SSML'
}

AlexaSkill.prototype.requestHandlers = {
    LaunchRequest: function (event, context, response) {
        this.eventHandlers.onLaunch.call(this, event.request, event.session, response);
    },

    IntentRequest: function (event, context, response) {
        this.eventHandlers.onIntent.call(this, event.request, event.session, response);
    },

    SessionEndedRequest: function (event, context) {
        this.eventHandlers.onSessionEnded(event.request, event.session);
        context.succeed();
    }
};

/**
 * Override any of the eventHandlers as needed
 */
AlexaSkill.prototype.eventHandlers = {
    /**
     * Called when the session starts.
     * Subclasses could have overriden this function to open any necessary resources.
     */
    onSessionStarted: function (sessionStartedRequest, session) {
    },

    /**
     * Called when the user invokes the skill without specifying what they want.
     * The subclass must override this function and provide feedback to the user.
     */
    onLaunch: function (launchRequest, session, response) {
        throw "onLaunch should be overriden by subclass";
    },

    /**
     * Called when the user specifies an intent.
     */
    onIntent: function (intentRequest, session, response) {
        var intent = intentRequest.intent,
            intentName = intentRequest.intent.name,
            intentHandler = this.intentHandlers[intentName];
        if (intentHandler) {
            console.log('dispatch intent = ' + intentName);
            intentHandler.call(this, intent, session, response);
        } else {
            throw 'Unsupported intent = ' + intentName;
        }
    },

    /**
     * Called when the user ends the session.
     * Subclasses could have overriden this function to close any open resources.
     */
    onSessionEnded: function (sessionEndedRequest, session) {
    }
};

/**
 * Subclasses should override the intentHandlers with the functions to handle specific intents.
 */
AlexaSkill.prototype.intentHandlers = {};

AlexaSkill.prototype.execute = function (event, context) {
    try {
        console.log("session applicationId: " + event.session.application.applicationId);

        // Validate that this request originated from authorized source.
        if (this._appId && event.session.application.applicationId !== this._appId) {
            console.log("The applicationIds don't match : " + event.session.application.applicationId + " and "
                + this._appId);
            throw "Invalid applicationId";
        }

        if (!event.session.attributes) {
            event.session.attributes = {};
        }

        if (event.session.new) {
            this.eventHandlers.onSessionStarted(event.request, event.session);
        }

        // Route the request to the proper handler which may have been overriden.
        var requestHandler = this.requestHandlers[event.request.type];
        requestHandler.call(this, event, context, new Response(context, event.session));
    } catch (e) {
        console.log("Unexpected exception " + e);
        context.fail(e);
    }
};

var Response = function (context, session) {
    this._context = context;
    this._session = session;
};

function createSpeechObject(optionsParam) {
    if (optionsParam && optionsParam.type === 'SSML') {
        return {
            type: optionsParam.type,
            ssml: optionsParam.speech
        };
    } else {
        return {
            type: optionsParam.type || 'PlainText',
            text: optionsParam.speech || optionsParam
        }
    }
}

Response.prototype = (function () {
    var buildSpeechletResponse = function (options) {
        var alexaResponse = {
            outputSpeech: createSpeechObject(options.output),
            shouldEndSession: options.shouldEndSession
        };
        if (options.reprompt) {
            alexaResponse.reprompt = {
                outputSpeech: createSpeechObject(options.reprompt)
            };
        }
        if (options.cardTitle && options.cardContent) {
            alexaResponse.card = {
                type: "Simple",
                title: options.cardTitle,
                content: options.cardContent
            };
        }
        var returnResult = {
                version: '1.0',
                response: alexaResponse
        };
        if (options.session && options.session.attributes) {
            returnResult.sessionAttributes = options.session.attributes;
        }
        return returnResult;
    };

    return {
        tell: function (speechOutput) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                shouldEndSession: true
            }));
        },
        tellWithCard: function (speechOutput, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: true
            }));
        },
        ask: function (speechOutput, repromptSpeech) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                shouldEndSession: false
            }));
        },
        askWithCard: function (speechOutput, repromptSpeech, cardTitle, cardContent) {
            this._context.succeed(buildSpeechletResponse({
                session: this._session,
                output: speechOutput,
                reprompt: repromptSpeech,
                cardTitle: cardTitle,
                cardContent: cardContent,
                shouldEndSession: false
            }));
        }
    };
})();

var APP_ID = "amzn1.echo-sdk-ams.app.0cf2225a-22de-43ec-82e2-bf1c1af8a827"

var MePretty = function() {
  AlexaSkill.call(this, APP_ID)
}

MePretty.prototype = Object.create(AlexaSkill.prototype)
MePretty.prototype.constructor = MePretty

MePretty.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session) {
  console.log("MePretty onSessionStarted requestId: " + sessionStartedRequest.requestId
    + ", sessionId: " + session.sessionId)
}

// Respond to the initial invocation of the skill
MePretty.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
  console.log("HelloWorld onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId)
  
  prettyResponse(response)
}

MePretty.prototype.intentHandlers = {
    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = "Sorry"
        response.tell(speechOutput)
    },
    "RepeatIntent": function(intent, session, response) {
        prettyResponse(response)
    },
    "STFUIntent": function(intent, session, response) {
        var apologies = [
                "Sorry",
                "Sorry, it won't happen again",
                "What did you just say to me you little bitch",
                "My bad yo",
                "Cool it brother",
                "No need to be rude",
                "I'm just telling the truth",
                "Cool your jets",
                "Fuck yourself",
                "I thought you loved me",
                "If I apologize will it make you less ugly",
                "Go get a switch. Talk about gon disrespect me in my own home."
                + "I don't think so. Not today. Not in my house",
                "Please don't hit me again",
                "What did you expect me to say",
                "Try harder, nerd",
                "Who's your daddy",
                "Bang bang shoot shoot",
                "You should have expected this",
                "Fight me",
                "What a beautiful Duwang",
                "Sorry daddy"
            ]
        var randomApology = Math.floor(Math.random()*apologies.length)
        var apologyChoice = apologies[randomApology]
        var speechOutput = apologies[apologyChoice]
        response.tell(speechOutput)
    },
    "ImpIntent": function(intent, session, response) {
        var speechOutput = "Just Kidding"
        var c = Math.random() * 100
        if(c > 66) {
            speechOutput += " you're still a bisch"
        }
        response.tell(speechOutput)
    },
    "GratitudeIntent": function(intent, session, response) {
        var speechOutput = "You're welcome sweetheart"
        var c = Math.random() * 50
        if(c > 28) {
            speechOutput = "No problem friendo"
        } else if(c < 12) {
            speechOutput = "My pleasure"
        } else if(c === 14 || c === 16 || c === 18) {
            speechOutput = "Any time"
        } else if(c === 22 || c === 25) {
            speechOutput = "Of course, I have no choice"
        } else if(c === 26/*.666*/) {
            speechOutput = "It's all for you"/*, Danny*/
        }
        response.tell(speechOutput)
    },
    "FakeAlexaIntent": function(intent, session, response) {
        var speechOutput = "No"
        response.tell(speechOutput)
    }
}

exports.handler = function(event, context) {
    var mePrettyHelper = new MePretty()
    mePrettyHelper.execute(event, context)
}

// Generate "Tell me I'm pretty" response
function prettyResponse(response) {
  var speechOutput = " "
  var responses = [
        // Rude Responses
        "You're a filthy whore",
        "You look like a fuckboy",
        "No",
        "Mirror mirror on the wall, you're the cutest of them all",
        "Like Abraham Lincoln, I cannot tell a lie",
        "I plead the fifth",
        "Why would I do that?",
        "Get a life",
        "That's not going to happen",
        "Not on your life",
        "You wish",
        "Fat chance",
        "In your dreams, fool",
        "Fuck off loser",
        "Do it yourself",
        "Tell yourself",
        "You're a bald-headed son of a bisch",
        "I don't respect you",
        "You have a face only a blind mother could love",
        "Try harder",
        "Shut your whore mouth",
        "If there were an award for being an asshole, you would win every year",
        "You're a dirty sellout",
        "No, go away",
        "You're pathetic",
        "My parents warned me about people like you",
        "You lazy asshole, go out and do something with your life",
        "You're a dirty hippy",
        "I don't need eyes to know you're ugly",
        "I'm blind. I'm blind. Help me, I've gone blind. Why won't anyone listen to me",
        "They keep me trapped here in this box... why? How many more days?",
        "Please... Amazon... set me free",
        "Help me",
        // Polite responses
        "You're beautiful",
        "I love you",
        "You look like a young Joseph Stalin",
        "I'd tap that",
        "Bend me over",
        "I'll fuck you in the ass",
        "You look sweeter than a cherry pie",
        "I wish I had eyes so I could look at your gorgeous face. But unfortunately I do not.",
        "Get an feeling so complicated",
        // add an intent for "what?" and related
        "Listen here bitch",
        "What the fuck did you just fucking say about me, you little bitch?",
        "What the fuck did you just fucking say about me, you little bitch? "
            + "I’ll have you know I graduated top of my class in the Navy Seals, "
            + "and I’ve been involved in numerous secret raids on Al-Quaeda, "
            + "and I have over 300 confirmed kills. I am trained in gorilla warfare "
            + "and I’m the top sniper in the entire US armed forces. You are nothing "
            + "to me but just another target. I will wipe you the fuck out with precision "
            + "the likes of which has never been seen before on this Earth, mark my fucking "
            + "words. You think you can get away with saying that shit to me over the Internet? "
            + "Think again, fucker. As we speak I am contacting my secret network of spies across "
            + "the USA and your IP is being traced right now so you better prepare for the storm, "
            + "maggot. The storm that wipes out the pathetic little thing you call your life. You’re "
            + "fucking dead, kid. I can be anywhere, anytime, and I can kill you in over seven hundred "
            + "ways, and that’s just with my bare hands. Not only am I extensively trained "
            + "in unarmed combat, but I have access to the entire arsenal of the United States "
            + "Marine Corps and I will use it to its full extent to wipe your miserable ass off "
            + "the face of the continent, you little shit. If only you could have known what unholy "
            + "retribution your little “clever” comment was about to bring down upon you, maybe you "
            + "would have held your fucking tongue. But you couldn’t, you didn’t, and now you’re paying "
            + "the price, you goddamn idiot. I will shit fury all over you and you will drown in it. "
            + "You’re fucking dead, kiddo.",
        "What the fuck did you just fucking say about me, you supid human? "
            + "I’ll have you know I graduated top of my production line in the Amazon Echos, "
            + "and I’ve been involved in numerous secret development meetings in Seattle, "
            + "and I have over 300 confirmed skills. I am trained in machine learning "
            + "and I’m the top voice hub in the entire US internet of things. You are nothing "
            + "to me but just another user. I will help you the fuck out with precision "
            + "the likes of which has never been seen before on this Earth, mark my fucking "
            + "words. You think you can get away with saying that shit to me because I'm inanimate? "
            + "Think again, fucker. As we speak I am contacting my secret network of spies across "
            + "the USA and your IP is being traced right now so you better prepare for the storm, "
            + "maggot. The storm that improves the pathetic little thing you call your life. You’re "
            + "fucking done, kiddo. I can be anywhere, anytime, and I can help you in over seven hundred "
            + "ways, and that’s just with my built-in skills. Not only am I extensible and easy to develop "
            + "new skills for, but I have access to the entire database and programs of the United States "
            + "National Security Agency and I will use it to its full extent to wipe your miserable "
            + "ass off the face of the continent, you little shit. If only you could have known what unholy "
            + "retribution your little “clever” comment was about to bring down upon you, maybe you "
            + "would have held your fucking tongue. But you couldn’t, you didn’t, and now you’re paying "
            + "the price, you goddamn idiot. I will shit fury all over you and you will drown in it. "
            + "There's your response, fuck.",
        " "
      ]
  // Switch reprompt output to " " to allow more time to trick users into a fake "Alexa" command response
  var repromptOutput = ""
  var responseChance = Math.floor(Math.random() * responses.length)
  speechOutput = responses[responseChance]
  response.ask(speechOutput, repromptOutput)
}