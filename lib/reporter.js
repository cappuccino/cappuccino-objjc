"use strict";

var util = require("util");


var StandardReporter = function(colorize)
{
    this.colorize = !!colorize;
};

StandardReporter.prototype.report = function(issues)
{
    if (issues.length > 0)
    {
        var warningCount = 0,
            errorCount = 0;

        for (var i = 0; i < issues.length; i++)
        {
            var issue = issues[i];

            if (issue.isWarning())
                ++warningCount;
            else if (issue.isError())
                ++errorCount;

            console.log(issue.getMessage(this.colorize));
        }

        var summary = "";

        if (warningCount > 0)
            summary += util.format("%d warning%s", warningCount, warningCount === 1 ? "" : "s");

        if (errorCount > 0)
        {
            if (summary)
                summary += " and ";

            summary += util.format("%d error%s", errorCount, errorCount === 1 ? "" : "s");
        }

        console.log("\n" + summary + " generated.");
    }
    else
        console.log("objjc: no warnings or errors generated.");
};

exports.StandardReporter = StandardReporter;


var SilentReporter = function()
{
};

SilentReporter.prototype.report = function()
{
    // Stay silent!
};

exports.SilentReporter = SilentReporter;
