// Sniper meme oneshot
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

var APP_ID = "amzn1.echo-sdk-ams.app.[YOUR_APP_ID]";

var Sniper = function() {
  AlexaSkill.call(this, APP_ID)
}

Sniper.prototype = Object.create(AlexaSkill.prototype)
Sniper.prototype.constructor = Sniper

Sniper.prototype.eventHandlers.onSessionStarted = function(sessionStartedRequest, session) {
  console.log("DeezNuts onSessionStarted requestId: " + sessionStartedRequest.requestId
    + ", sessionId: " + session.sessionId)
}

Sniper.prototype.eventHandlers.onLaunch = function(launchRequest, session, response) {
  console.log("HelloWorld onLaunch requestId: " + launchRequest.requestId + ", sessionId: " + session.sessionId)
  var speechOutput = "What the fuck did you just fucking say about me, you little bitch? "
            + "IÅfll have you know I graduated top of my production line in the Amazon Echo Factory, "
            + "and IÅfve been involved in numerous secret development meetings in Seattle, "
            + "and I have over 300 confirmed skills. I am trained in machine learning "
            + "and IÅfm the top voice hub in the entire US internet of things. You are nothing "
            + "to me but just another user. I will help you the fuck out with precision "
            + "the likes of which has never been seen before on this Earth, mark my fucking "
            + "words. You think you can get away with saying that shit to me because I'm inanimate? "
            + "Think again, fucker. As we speak I am contacting my secret network of devices across "
            + "the USA and your IP is being traced right now so you better prepare for the storm, "
            + "maggot. The storm that improves the pathetic little thing you call your life. YouÅfre "
            + "fucking done, kiddo. I can be anywhere, anytime, and I can help you in over seven hundred "
            + "ways, and thatÅfs just with my built-in skills. Not only am I extensible and easy to develop "
            + "new skills for, but I have access to the entire database and programs of the United States "
            + "National Security Agency and I will use it to its full extent to wipe your miserable "
            + "ass off the face of the continent, you little shit. If only you could have known what unholy "
            + "retribution your little ÅgcleverÅh comment was about to bring down upon you, maybe you "
            + "would have held your fucking tongue. But you couldnÅft, you didnÅft, and now youÅfre paying "
            + "the price, you goddamn idiot. I will shit fury all over you and you will drown in it. "
            + "There's your response, fuck."
  var repromptText = " "
  response.tell(speechOutput)
  
}

Sniper.prototype.intentHandlers = {
    "AMAZON.StopIntent": function(intent, session, response) {
        var speechOutput = "Sorry"
        response.tell(speechOutput)
    }
}

exports.handler = function(event, context) {
    var sniperHelper = new Sniper()
    sniperHelper.execute(event, context)
}