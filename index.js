'use strict';
var Alexa = require('alexa-sdk');
var https = require('https');

var APP_ID = "amzn1.ask.skill.93f1deb9-d64b-4211-a77b-a627a579f409";
var SKILL_NAME = 'CTF Checker';


exports.handler = function(event, context, callback) {
    var alexa = Alexa.handler(event, context);
    alexa.APP_ID = APP_ID;
    alexa.registerHandlers(handlers);
    alexa.execute();
};

var handlers = {
    'LaunchRequest': function () {
        console.log("started request");
        this.emit(':ask', "Hi, you can say top teams of 2015 or upcoming events.", "Just say top teams");
    },
    'GetUpcomingCTF': function () {
        var now = Date.parse(new Date())/1000;
        var future = now + 90*24*60*60;

        var options = {
            host: 'ctftime.org',
            port: 443,
            path: `/api/v1/events/?limit=15&start=${now}&finish=${future}`,
        //  method: 'POST'
        };

        var ctx = this;

        var req = https.request(options, function(res) {

            res.setEncoding('utf8');
            var body = "";
            res.on('data', function (chunk) {
                body += chunk;
            });

            var finalOutput = "";
            var cardContent = "Showed first 15 events starting in the next 90 days";
            res.on('end', function () {
                var jbody = JSON.parse(body);

                for (let event of jbody) {
                    finalOutput += `${event.title}, ${event.format} style CTF, starts on ${formatDate(event.start)}`;
                    if (event.onsite) {
                        finalOutput += ` and takes place in ${event.location}`;
                    }
                    finalOutput += ". "
                }

                ctx.emit(':tellWithCard', finalOutput, SKILL_NAME, cardContent);
            });
        });

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            var output = "Sorry, having problem reaching CTF Time now. Please try again later.";
            ctx.emit(':tellWithCard', output, SKILL_NAME, output);
        });

        req.end();
    },
    'GetEverSec': function() {
        var options = {
            host: 'ctftime.org',
            port: 443,
            path: '/api/v1/teams/22889/',
        //  method: 'POST'
        };

        var ctx = this;

        var req = https.request(options, function(res) {

            res.setEncoding('utf8');
            var body = "";
            res.on('data', function (chunk) {
                body += chunk;
            });

            var finalOutput = "";
            var cardContent = "Showed CTF ranking information of team EverSec <3";
            res.on('end', function () {
                var jbody = JSON.parse(body);
                for (var idx in jbody.rating) {
                    var yearStats = jbody.rating[idx];
                    for (var key in yearStats) {
                        finalOutput += `Ranked ${yearStats[key].rating_place} with ${yearStats[key].rating_points.toFixed(2)} points in ${key}. `; 
                    }
                }

                ctx.emit(':tellWithCard', finalOutput, SKILL_NAME, cardContent);
            });
        });

        req.on('error', function(e) {
            console.log('problem with request: ' + e.message);
            var output = "Sorry, having problem reaching CTF Time now. Please try again later.";
            ctx.emit(':tellWithCard', output, SKILL_NAME, output);
        });

        req.end();
    },
    'GetTopTen': function () {

        var options = {
            host: 'ctftime.org',
            port: 443,
            path: '/api/v1/top/',
        //  method: 'POST'
        };

        var date = this.event.request.intent.slots.date.value;
        var fourdigit = this.event.request.intent.slots.fourdigit.value;
        console.log(`Got date: ${date} and four digits: ${fourdigit} from request`);
        // when there is no recognizable date, it's empty. When the utterance without a slot is used, it's null
        date = date == null || date == "" ? new Date() : new Date(date);
        date = date.getFullYear();

        date = fourdigit == null || fourdigit == "" ? date : fourdigit;

        var currentYear = (new Date()).getFullYear();

        if (date > currentYear) {
            this.emit(':tellWithCard', "As much as I'd like to, I can't predict the future.", SKILL_NAME, "Nice try");
        }
        else {
            options.path += date + "/";
            var ctx = this;

            var req = https.request(options, function(res) {

                res.setEncoding('utf8');
                var body = "";
                res.on('data', function (chunk) {
                    body += chunk;
                });

                var cardContent = `Showed top ten teams of ${date}`;
                var finalOutput = "";
                res.on('end', function () {
                    var result = JSON.parse(body);
                    if (Object.getOwnPropertyNames(result).length == 0 || result[date].length == 0) {
                        ctx.emit(':tellWithCard', `There is no ranking information for ${date}`, SKILL_NAME, `No ranking info for ${date}`);
                    }
                    else {
                        var topTen = result[date];
                        for (var idx in topTen) {
                            var rank = idx + 1;
                            finalOutput += `No. ${parseInt(idx)+1} is ${topTen[idx].team_name} with ${Math.floor(topTen[idx].points)} points. `;
                        }
                        finalOutput = `In ${date}, ${finalOutput}`;
                        ctx.emit(':tellWithCard', finalOutput, SKILL_NAME, cardContent);
                    }
                });

            });

            req.on('error', function(e) {
                console.log('problem with request: ' + e.message);
                var output = "Sorry, having problem reaching hacker news now. Please try again later.";
                ctx.emit(':tellWithCard', output, SKILL_NAME, output);
            });

            req.end();
        }
    },
    'AMAZON.HelpIntent': function () {
        var speechOutput = "You can say who are top ten of last year, or what's next.";
        var reprompt = "Try say top ten";
        this.emit(':ask', speechOutput, reprompt);
    },
    'AMAZON.CancelIntent': function () {
        this.emit(':tell', 'Bye!');
    },
    'AMAZON.StopIntent': function () {
        this.emit(':tell', 'Bye!');
    },
    'Unhandled': function () {
        console.log(JSON.stringify(this.event.request));
        this.emit('AMAZON.HelpIntent');
    }
};

function formatDate(date) {
    //var date = "2017-06-09T16:00:00+00:00";

    var mth = date.split("-")[1];
    var day = date.split("-")[2].split("T")[0];
    var hour = date.split(":")[0].split("T")[1];
    var min = date.split(":")[1];
    var apm = "am";

    if (hour >= 12) {
        if (hour > 12) {
            hour = hour - 12;
        }
        apm = "pm";
    }

    if (min == "00") {
        min = "";
    }

    return `<say-as interpret-as="date">????${mth}${day}</say-as> ${hour} ${min} ${apm} <say-as interpret-as="spell-out">UTC</say-as>`;
}
