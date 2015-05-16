/*
 * utils.js
 *
 * Created by Aparajita Fishman.
 * Copyright 2014, Aparajita Fishman.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the MIT license (http://opensource.org/licenses/MIT).
 */

"use strict";

var fs = require("fs"),
    path = require("path"),
    reporter = require("../../lib/reporter"),
    Runner = require("../../lib/runner");

require("chai").should();

exports.compiledFixture = function(file, options)
{
    if (path.extname(file) === "")
        file += ".j";

    var sourcePath = file;

    if (!path.isAbsolute(file))
        sourcePath = path.resolve(path.join("test", "fixtures", file));

    options = options || {};

    var hook;

    try
    {
        if (options.captureStdout)
            hook = exports.captureStream(process.stdout, true);

        options = {
            sourceMap: options.sourceMap,
            acornOptions: {},
            quiet: true,
            warnings: options.warnings || ["all"],
            maxErrors: options.maxErrors || 100,
            reporter: options.captureStdout ? reporter.StandardReporter : reporter.SilentReporter
        };

        var runner = new Runner(options),
            stdout;

        runner.compileFile(sourcePath);

        if (hook)
        {
            stdout = hook.captured();
            hook.unhook();
        }
        else
            stdout = "";

        var compiler = runner.getCompiler();

        return {
            code: compiler ? compiler.getCode() : "",
            map: (compiler && options.sourceMap) ? compiler.getSourceMap() : "",
            stdout: stdout
        };
    }
    catch (ex)
    {
        if (hook)
            hook.unhook();

        console.error(ex.message);
    }

    return { code: "", map: "", stdout: "" };
};

exports.readFixture = function(name)
{
    var extension = path.extname(name),
        filename = extension ? name : name + ".js",
        fixturePath = path.join("test", "fixtures", filename);

    try
    {
        return fs.readFileSync(fixturePath, { encoding: "utf8" });
    }
    catch (e)
    {
        if (e.code === "ENOENT")
            console.error("No such fixture '" + fixturePath + "'");
        else
            console.error(e.message);
    }

    return "";
};

exports.compareWithFixture = function(fixture)
{
    exports.compiledFixture(fixture).code.should.equal(exports.readFixture(fixture));
};

exports.captureStream = function(stream, silent)
{
    var oldWrite = stream.write,
        buffer = "";

    stream.write = function(chunk)
    {
        buffer += chunk.toString(); // chunk is a String or Buffer

        if (!silent)
            oldWrite.apply(stream, arguments);
    };

    return {
        unhook: function unhook()
        {
            stream.write = oldWrite;
        },
        captured: function()
        {
            return buffer;
        }
    };
};

/* global describe, it */
/* jshint loopfunc: true */
/*eslint-disable max-nested-callbacks, no-loop-func */

function makeDescribe(description, should, fixture)
{
    describe(description, function()
    {
        it(should, function()
        {
            exports.compareWithFixture(fixture);
        });
    });
}

exports.makeDescribes = function(data, pathPrefix)
{
    for (var i = 0; i < data.length; ++i)
    {
        var info = data[i],
            description = info[0],
            should = info[1],
            fixture = path.join(pathPrefix, info[2] ? info[2] : info[0]);

        makeDescribe(description, should, fixture);
    }
};
