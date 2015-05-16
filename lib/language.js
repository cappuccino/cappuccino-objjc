/*
 * language.js
 *
 * Created by Martin Carlberg.
 * Copyright 2013, Martin Carlberg.
 *
 * Additional work by Aparajita Fishman.
 *
 * This library is free software; you can redistribute it and/or
 * modify it under the terms of the MIT license (http://opensource.org/licenses/MIT).
 */

"use strict";

var makeTemplate = require("./utils").makeTemplate;

/*
    Both ClassDef and ProtocolDef conform to a 'protocol' (that we can't declare in Javascript).
    Both have the attribute 'protocols': Array of ProtocolDef that they conform to.
    Both also have the functions: addInstanceMethod, addClassMethod, getInstanceMethod and getClassMethod
    classDef = {
        "className": aClassName,
        "superClass": superClass ,
        "ivars": myIvars,
        "instanceMethods": instanceMethodDefs,
        "classMethods": classMethodDefs,
        "protocols": myProtocols
    };
*/

var ClassDefTypes = {
    implementation: 1,
    class: 2
};

exports.ClassDefTypes = ClassDefTypes;

var ClassDef = function(node, name, superclassNode, superclassDef, ivars, instanceMethods, classMethods, protocols)
{
    this.node = node;
    this.name = name;

    if (superclassNode)
    {
        this.superclassNode = superclassNode;
        this.superclassDef = superclassDef;
    }

    if (ivars)
        this.ivars = ivars;

    this.instanceMethods = instanceMethods || Object.create(null);
    this.classMethods = classMethods || Object.create(null);

    if (protocols)
        this.protocols = protocols;
};

ClassDef.instanceMethodType = 1;
ClassDef.classMethodType = 1;

ClassDef.prototype.addInstanceMethod = function(methodDef)
{
    this.instanceMethods[methodDef.name] = methodDef;
};

ClassDef.prototype.addClassMethod = function(methodDef)
{
    this.classMethods[methodDef.name] = methodDef;
};

ClassDef.prototype.unimplementedMethodsForProtocol = function(protocolDef)
{
    var results = [],
        methodSources = [
            {
                required: protocolDef.requiredInstanceMethods,
                type: ClassDef.instanceMethodType
            },
            {
                required: protocolDef.requiredClassMethods,
                type: ClassDef.classMethodType
            }
        ];

    for (var i = 0; i < methodSources.length; i++)
    {
        var requiredMethods = methodSources[i].required;

        if (requiredMethods)
        {
            var implementedMethods = this.getMethods(methodSources[i].type);

            for (var methodName in requiredMethods)
            {
                if (!(methodName in implementedMethods))
                    results.push(
                        {
                            "methodDef": requiredMethods[methodName],
                            "protocolDef": protocolDef
                        }
                    );
            }
        }
    }

    if (protocolDef.protocols)
    {
        for (var i = 0; i < protocolDef.protocols.length; i++)
            results = results.concat(this.unimplementedMethodsForProtocol(protocolDef.protocols[i]));
    }

    return results;
};

ClassDef.prototype.getMethod = function(name, type)
{
    var methods = type === ClassDef.instanceMethodType ? this.instanceMethods : this.classMethods;

    if (methods)
    {
        var method = methods[name];

        if (method)
            return method;
    }

    if (this.superclassDef)
        return this.superclassDef.getMethod(name, type);

    return null;
};

ClassDef.prototype.getInstanceMethod = function(name)
{
    return this.getMethod(name, ClassDef.instanceMethodType);
};

ClassDef.prototype.getOwnInstanceMethod = function(name)
{
    return this.instanceMethods[name];
};

ClassDef.prototype.getClassMethod = function(name)
{
    return this.getMethod(name, ClassDef.classMethodType);
};

ClassDef.prototype.getOwnClassMethod = function(name)
{
    return this.classMethods[name];
};

ClassDef.prototype.getMethods = function(type)
{
    var methods = type === ClassDef.instanceMethodType ? this.instanceMethods : this.classMethods;

    if (methods)
    {
        var returnObject = Object.create(null),
            methodName;

        if (this.superclassDef)
        {
            var superclassMethods = this.superclassDef.getMethods(type);

            for (methodName in superclassMethods)
                returnObject[methodName] = superclassMethods[methodName];
        }

        for (methodName in methods)
            returnObject[methodName] = methods[methodName];

        return returnObject;
    }

    return Object.create(null);
};

// Return a new Array with all instance methods, including inherited
ClassDef.prototype.getInstanceMethods = function()
{
    return this.getMethods(ClassDef.instanceMethodType);
};

// Return a new Array with all class methods, including inherited
ClassDef.prototype.getClassMethods = function()
{
    return this.getMethods(ClassDef.classMethodType);
};

ClassDef.categoryTemplate = makeTemplate(
        "// ${data.comment}\n" +
        "var $the_class = objj_getClass(\"${data.class}\");\n" +
        "\n" +
        "if (!$the_class)\n" +
        "→throw new SyntaxError(\"Undefined class: ${data.class}\");\n"
);

ClassDef.declarationTemplate = makeTemplate(
        "// ${data.comment}\n" +
        "var $the_class = objj_allocateClassPair(${data.superclass}, \"${data.class}\");\n"
);

ClassDef.protocolTemplate = makeTemplate(
        "${data.var}$the_protocol = objj_getProtocol(\"${data.name}\");\n" +
        "\n" +
        "if (!$the_protocol)\n" +
        "→throw new SyntaxError(\"Undefined protocol: ${data.name}\");\n" +
        "\n" +
        "class_addProtocol($the_class, $the_protocol);\n"
);

ClassDef.getterTemplate = makeTemplate(
        "\n" +
        "// @accessors(${data.readonly}getter=${data.selector})\n" +
        "new objj_method(sel_getUid(\"${data.selector}\"),\n" +
        "function $${data.class}__${data.selector}(self, _cmd)\n" +
        "{\n" +
        "→return self.${data.ivar};\n" +
        "},\n" +
        "// argument types\n" +
        "[\"${data.returnType}\"]),"
);

ClassDef.setterTemplate = makeTemplate(
        "\n" +
        "// @accessors(setter=${data.setter})\n" +
        "new objj_method(sel_getUid(\"${data.selector}\"),\n" +
        "function $${data.class}__${data.setter}_(self, _cmd, newValue)\n" +
        "{\n" +
        "${data.code}\n" +
        "},\n" +
        "// argument types\n" +
        "[\"void\", \"${data.returnType}\"]),"
);

ClassDef.setterCopyTemplate = makeTemplate(
        "if (self.${data.ivar} !== newValue)\n" +
        "→self.${data.ivar} = newValue == null ? null : newValue.isa.objj_msgSend0(newValue, \"copy\");"
);

exports.ClassDef = ClassDef;

/*
 protocolDef = {
 "name": aProtocolName,
 "protocols": inheritFromProtocols,
 "requiredInstanceMethods": requiredInstanceMethodDefs,
 "requiredClassMethods": requiredClassMethodDefs
 };
 */
var ProtocolDef = function(node, name, protocols, requiredInstanceMethodDefs, requiredClassMethodDefs)
{
    this.node = node;
    this.name = name;
    this.protocols = protocols;
    this.requiredInstanceMethods = requiredInstanceMethodDefs || Object.create(null);
    this.requiredClassMethods = requiredClassMethodDefs || Object.create(null);
};

ProtocolDef.prototype.addInstanceMethod = function(methodDef)
{
    this.requiredInstanceMethods[methodDef.name] = methodDef;
};

ProtocolDef.prototype.addClassMethod = function(methodDef)
{
    this.requiredClassMethods[methodDef.name] = methodDef;
};

ProtocolDef.prototype.getMethod = function(name, methods)
{
    var method;

    if (methods)
    {
        method = methods[name];

        if (method)
            return method;
    }

    var protocols = this.protocols;

    for (var i = 0; i < protocols.length; i++)
    {
        method = protocols[i].getMethod(name, methods);

        if (method)
            return method;
    }

    return null;
};

ProtocolDef.prototype.getInstanceMethod = function(name)
{
    return this.getMethod(name, this.requiredInstanceMethods);
};

ProtocolDef.prototype.getOwnInstanceMethod = function(name)
{
    return this.requiredInstanceMethods[name];
};

ProtocolDef.prototype.getClassMethod = function(name)
{
    return this.getMethod(name, this.requiredClassMethods);
};

ProtocolDef.prototype.getOwnClassMethod = function(name)
{
    return this.requiredClassMethods[name];
};

ProtocolDef.declarationTemplate = makeTemplate(
        "// ${data.comment}\n" +
        "var $the_protocol = objj_allocateProtocol(\"${data.name}\");\n" +
        "objj_registerProtocol($the_protocol);\n"
);

ProtocolDef.inheritedDeclarationTemplate = makeTemplate(
        "${data.var}$the_inherited_protocol = objj_getProtocol(\"${data.name}\");\n" +
        "\n" +
        "if (!$the_inherited_protocol)\n" +
        "→throw new SyntaxError(\"Undefined protocol: ${data.name}\");\n" +
        "\n" +
        "protocol_addProtocol($the_protocol, $the_inherited_protocol);"
);

exports.ProtocolDef = ProtocolDef;

var MethodDef = function(node, name, types)
{
    this.node = node;
    this.name = name;
    this.types = types;
};

MethodDef.declarationTemplate = makeTemplate(
        "\n" +
        "// ${data.type}${data.selector}\n" +
        "new objj_method(sel_getUid(\"${data.selector}\"),"
);

exports.MethodDef = MethodDef;

exports.TypeDef = function(name)
{
    this.name = name;
};
