"use strict";

/*global describe, it */
/* jshint loopfunc: true */
/* eslint-disable max-nested-callbacks, no-loop-func */

var path = require("path"),
    utils = require("./lib/utils");

var data = [
    ["@deref", "should check for reference expressions that have side effects and generate an error"],
    ["@protocol", "should check for existence and generate an error"],
    ["acorn errors", "should be caught and show where the error occurred", "acorn"],
    ["classes", "should be checked for duplicate methods/ivars, conflicting return/parameter types, and conflicting accessors, and specific warnings should be given", "class-declaration"],
    ["global symbols", "should be checked for redefinition as a different type and specific warnings should be given", "redefinition"],
    ["identifiers", "should be checked for existence and shadowing, and specific warnings should be given"],
    ["ivars and method parameters", "should be checked for unknown types and specific warnings should be given", "protocols"],
    ["protocols", "should be checked for existence and conformance and specific warnings should be given"],
    ["types", "should be known"],
];

function makeDescribe(description, should, prefix)
{
    describe(description, function()
    {
        it(should, function()
        {
            var output = utils.compiledFixture(prefix, { captureStdout: true });

            output.stdout.should.equalFixture(prefix + ".txt");
        });
    });
}

describe("Compiler warnings", function()
{
    for (var i = 0; i < data.length; ++i)
    {
        var info = data[i],
            description = info[0],
            should = info[1],
            prefix = path.join("warnings", info[2] ? info[2] : info[0]);

        makeDescribe(description, should, prefix);
    }
});
