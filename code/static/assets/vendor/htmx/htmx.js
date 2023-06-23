// UMD insanity
// This code sets up support for (in order) AMD, ES6 modules, and globals.
(function (root, factory) {
    //@ts-ignore
    if (typeof define === 'function' && define.amd) define([], factory); // AMD. Register as an anonymous module.
    // Node. Does not work with strict CommonJS, but only CommonJS-like environments that support module.exports, like Node.
    else if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.htmx = root.htmx || factory(); // Browser globals
}(typeof self !== 'undefined' ? self : this, function () {
return (function () {
    'use strict';
    // Public API
    // ** @type {import("./htmx").HtmxApi} */
    // TODO: list all methods in public API
    let htmx = {
        onLoad: onLoadHelper,
        process: processNode,
        on: addEventListenerImpl,
        off: removeEventListenerImpl,
        trigger : triggerEvent,
        ajax : ajaxHelper,
        find : find,
        findAll : findAll,
        closest : closest,
        values : function(elt, type){
            let inputValues = getInputValues(elt, type || "post");
            return inputValues.values;
        },
        remove : removeElement,
        addClass : addClassToElement,
        removeClass : removeClassFromElement,
        toggleClass : toggleClassOnElement,
        takeClass : takeClassForElement,
        defineExtension : defineExtension,
        removeExtension : removeExtension,
        logAll : logAll,
        logger : null,
        config : {
            historyEnabled:true,
            historyCacheSize:10,
            refreshOnHistoryMiss:false,
            defaultSwapStyle:'innerHTML',
            defaultSwapDelay:0,
            defaultSettleDelay:20,
            includeIndicatorStyles:true,
            indicatorClass:'htmx-indicator',
            requestClass:'htmx-request',
            addedClass:'htmx-added',
            settlingClass:'htmx-settling',
            swappingClass:'htmx-swapping',
            allowEval:true,
            inlineScriptNonce:'',
            attributesToSettle:["class", "style", "width", "height"],
            withCredentials:false,
            timeout:0,
            wsReconnectDelay: 'full-jitter',
            wsBinaryType: 'blob',
            disableSelector: "[hx-disable], [data-hx-disable]",
            useTemplateFragments: false,
            scrollBehavior: 'smooth',
            defaultFocusScroll: false,
            getCacheBusterParam: false,
            globalViewTransitions: false,
        },
        parseInterval:parseInterval,
        _:internalEval,
        createEventSource: (url) =>{ return new EventSource(url, {withCredentials:true}); },
        createWebSocket: function(url){
            let sock = new WebSocket(url, []);
            sock.binaryType = htmx.config.wsBinaryType;
            return sock;
        },
        version: "1.9.0"
    };
    /** @type {import("./htmx").HtmxInternalApi} */
    let internalAPI = {
        addTriggerHandler: addTriggerHandler,
        bodyContains: bodyContains,
        canAccessLocalStorage: canAccessLocalStorage,
        filterValues: filterValues,
        hasAttribute: hasAttribute,
        getAttributeValue: getAttributeValue,
        getClosestMatch: getClosestMatch,
        getExpressionVars: getExpressionVars,
        getHeaders: getHeaders,
        getInputValues: getInputValues,
        getInternalData: getInternalData,
        getSwapSpecification: getSwapSpecification,
        getTriggerSpecs: getTriggerSpecs,
        getTarget: getTarget,
        makeFragment: makeFragment,
        mergeObjects: mergeObjects,
        makeSettleInfo: makeSettleInfo,
        oobSwap: oobSwap,
        selectAndSwap: selectAndSwap,
        settleImmediately: settleImmediately,
        shouldCancel: shouldCancel,
        triggerEvent: triggerEvent,
        triggerErrorEvent: triggerErrorEvent,
        withExtensions: withExtensions,
    }
    let VERBS = ['get', 'post', 'put', 'delete', 'patch'];
    let VERB_SELECTOR = VERBS.map((verb) =>{ return "[hx-" + verb + "], [data-hx-" + verb + "]"; }).join(", ");
    //====================================================================
    // Utilities
    //====================================================================
    function parseInterval(str) {
        if (str === undefined) return undefined;
        if (str.slice(-2) === "ms") return parseFloat(str.slice(0,-2)) || undefined;
        if (str.slice(-1) === "s") return (parseFloat(str.slice(0,-1)) * 1000) || undefined;
        if (str.slice(-1) === "m") return (parseFloat(str.slice(0,-1)) * 1000 * 60) || undefined;
        return parseFloat(str) || undefined;
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} name
     * @returns {(string | null)}
     */
    function getRawAttribute(elt, name) {
        return elt.getAttribute && elt.getAttribute(name);
    }
    // resolve with both hx and data-hx prefixes
    function hasAttribute(elt, qualifiedName) {
        return elt.hasAttribute && (elt.hasAttribute(qualifiedName) || elt.hasAttribute("data-" + qualifiedName));
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} qualifiedName
     * @returns {(string | null)}
     */
    function getAttributeValue(elt, qualifiedName) {
        return getRawAttribute(elt, qualifiedName) || getRawAttribute(elt, "data-" + qualifiedName);
    }
    /**
     * @param {HTMLElement} elt
     * @returns {HTMLElement | null}
     */
    function parentElt(elt) {
        return elt.parentElement;
    }
    /**
     * @returns {Document}
     */
    function getDocument() {
        return document;
    }
    /**
     * @param {HTMLElement} elt
     * @param {(e:HTMLElement) => boolean} condition
     * @returns {HTMLElement | null}
     */
    function getClosestMatch(elt, condition) {
        while (elt && !condition(elt)) {
            elt = parentElt(elt);
        }
        return elt ? elt : null;
    }
    function getAttributeValueWithDisinheritance(initialElement, ancestor, attributeName){
        let attributeValue = getAttributeValue(ancestor, attributeName);
        let disinherit = getAttributeValue(ancestor, "hx-disinherit");
        if (initialElement !== ancestor && disinherit && (disinherit === "*" || disinherit.split(" ").indexOf(attributeName) >= 0)) return "unset";
        return attributeValue;
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} attributeName
     * @returns {string | null}
     */
    function getClosestAttributeValue(elt, attributeName) {
        let closestAttr = null;
        getClosestMatch(elt, function (e) {
            return closestAttr = getAttributeValueWithDisinheritance(elt, e, attributeName);
        });
        if (closestAttr !== "unset") return closestAttr;
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} selector
     * @returns {boolean}
     */
    function matches(elt, selector) {
        // @ts-ignore: non-standard properties for browser compatability
        // noinspection JSUnresolvedVariable
        let matchesFunction = elt.matches || elt.matchesSelector || elt.msMatchesSelector || elt.mozMatchesSelector || elt.webkitMatchesSelector || elt.oMatchesSelector;
        return matchesFunction && matchesFunction.call(elt, selector);
    }
    /**
     * @param {string} str
     * @returns {string}
     */
    function getStartTag(str) {
        let tagMatcher = /<([a-z][^\/\0>\x20\t\r\n\f]*)/i, match = tagMatcher.exec( str );
        if (match) return match[1].toLowerCase();
        return "";
    }
    /**
     * @param {string} resp
     * @param {number} depth
     * @returns {Element}
     */
    function parseHTML(resp, depth) {
        let parser = new DOMParser(), responseDoc = parser.parseFromString(resp, "text/html");
        /** @type {Element} */
        let responseNode = responseDoc.body;
        while (depth > 0) {
            depth--;
            // @ts-ignore
            responseNode = responseNode.firstChild;
        }
        // @ts-ignore
        if (responseNode == null) responseNode = getDocument().createDocumentFragment();
        return responseNode;
    }
    function aFullPageResponse(resp) {
        return resp.match(/<body/);
    }
    /**
     * @param {string} resp
     * @returns {Element}
     */
    function makeFragment(resp) {
        let partialResponse = !aFullPageResponse(resp);
        if (htmx.config.useTemplateFragments && partialResponse) {
            let documentFragment = parseHTML("<body><template>" + resp + "</template></body>", 0);
            // @ts-ignore type mismatch between DocumentFragment and Element.
            // TODO: Are these close enough for htmx to use interchangably?
            return documentFragment.querySelector('template').content;
        } else {
            let startTag = getStartTag(resp);
            switch (startTag) {
                case "thead":
                case "tbody":
                case "tfoot":
                case "colgroup":
                case "caption":
                    return parseHTML("<table>" + resp + "</table>", 1);
                case "col":
                    return parseHTML("<table><colgroup>" + resp + "</colgroup></table>", 2);
                case "tr":
                    return parseHTML("<table><tbody>" + resp + "</tbody></table>", 2);
                case "td":
                case "th":
                    return parseHTML("<table><tbody><tr>" + resp + "</tr></tbody></table>", 3);
                case "script":
                    return parseHTML("<div>" + resp + "</div>", 1);
                default:
                    return parseHTML(resp, 0);
            }
        }
    }
    /**
     * @param {Function} func
     */
    function maybeCall(func){
        if (func) func();
    }
    /**
     * @param {any} o
     * @param {string} type
     * @returns
     */
    function isType(o, type) {
        return Object.prototype.toString.call(o) === "[object " + type + "]";
    }
    /**
     * @param {*} o
     * @returns {o is Function}
     */
    function isFunction(o) {
        return isType(o, "Function");
    }
    /**
     * @param {*} o
     * @returns {o is Object}
     */
    function isRawObject(o) {
        return isType(o, "Object");
    }
    /**
     * getInternalData retrieves "private" data stored by htmx within an element
     * @param {HTMLElement} elt
     * @returns {*}
     */
    function getInternalData(elt) {
        let dataProp = 'htmx-internal-data', data = elt[dataProp];
        if (!data) data = elt[dataProp] = {};
        return data;
    }
    /**
     * toArray converts an ArrayLike object into a real array.
     * @param {ArrayLike} arr
     * @returns {any[]}
     */
    function toArray(arr) {
        let returnArr = [];
        if (arr) {
            for (let i = 0; i < arr.length; i++) {
                returnArr.push(arr[i]);
            }
        }
        return returnArr;
    }
    function forEach(arr, func) {
        if (arr) {
            for (let i = 0; i < arr.length; i++) {
                func(arr[i]);
            }
        }
    }
    function isScrolledIntoView(el) {
        let rect = el.getBoundingClientRect(), elemTop = rect.top, elemBottom = rect.bottom;
        return elemTop < window.innerHeight && elemBottom >= 0;
    }
    function bodyContains(elt) {
        // IE Fix
        if (elt.getRootNode && elt.getRootNode() instanceof ShadowRoot) return getDocument().body.contains(elt.getRootNode().host);
        return getDocument().body.contains(elt);
    }
    function splitOnWhitespace(trigger) {
        return trigger.trim().split(/\s+/);
    }
    /**
     * mergeObjects takes all of the keys from obj2 and duplicates them into obj1
     * @param {Object} obj1
     * @param {Object} obj2
     * @returns {Object}
     */
    function mergeObjects(obj1, obj2) {
        for (let key in obj2) {
            if (obj2.hasOwnProperty(key)) obj1[key] = obj2[key];
        }
        return obj1;
    }
    function parseJSON(jString) {
        try {
            return JSON.parse(jString);
        } catch(error) {
            logError(error);
            return null;
        }
    }
    function canAccessLocalStorage() {
        let test = 'htmx:localStorageTest';
        try {
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch(e) {
            return false;
        }
    }
    //==========================================================================================
    // public API
    //==========================================================================================
    function internalEval(str){
        return maybeEval(getDocument().body, () => { return eval(str); });
    }
    function onLoadHelper(callback) {
        return htmx.on("htmx:load", (evt) => { callback(evt.detail.elt); });
    }
    function logAll(){
        htmx.logger = function(elt, event, data) {
            if (console) console.log(event, elt, data);
        }
    }
    function find(eltOrSelector, selector) {
        if (selector) return eltOrSelector.querySelector(selector);
        return find(getDocument(), eltOrSelector);
    }
    function findAll(eltOrSelector, selector) {
        if (selector) return eltOrSelector.querySelectorAll(selector);
        return findAll(getDocument(), eltOrSelector);
    }
    function removeElement(elt, delay) {
        elt = resolveTarget(elt);
        if (delay) {
            setTimeout(function(){
                removeElement(elt);
                elt = null;
            }, delay);
        } else elt.parentElement.removeChild(elt);
    }
    function addClassToElement(elt, clazz, delay) {
        elt = resolveTarget(elt);
        if (delay) {
            setTimeout(function(){
                addClassToElement(elt, clazz);
                elt = null;
            }, delay);
        } else elt.classList && elt.classList.add(clazz);
    }
    function removeClassFromElement(elt, clazz, delay) {
        elt = resolveTarget(elt);
        if (delay) {
            setTimeout(function(){
                removeClassFromElement(elt, clazz);
                elt = null;
            }, delay);
        } else {
            if (elt.classList) {
                elt.classList.remove(clazz);
                // if there are no classes left, remove the class attribute
                if (elt.classList.length === 0) elt.removeAttribute("class");
            }
        }
    }
    function toggleClassOnElement(elt, clazz) {
        elt = resolveTarget(elt);
        elt.classList.toggle(clazz);
    }
    function takeClassForElement(elt, clazz) {
        elt = resolveTarget(elt);
        forEach(elt.parentElement.children, function(child){
            removeClassFromElement(child, clazz);
        })
        addClassToElement(elt, clazz);
    }
    function closest(elt, selector) {
        elt = resolveTarget(elt);
        if (elt.closest) return elt.closest(selector);
        else {
            // TODO remove when IE goes away
            do{
                if (elt === null || matches(elt, selector)) return elt;
            }
            while (elt = elt && parentElt(elt));
            return null;
        }
    }
    function normalizeSelector(selector) {
        let trimmedSelector = selector.trim();
        if (trimmedSelector.startsWith("<") && trimmedSelector.endsWith("/>")) return trimmedSelector.substring(1, trimmedSelector.length - 2);
        return trimmedSelector;
    }
    function querySelectorAllExt(elt, selector) {
        if (selector.indexOf("closest ") === 0) return [closest(elt, normalizeSelector(selector.substr(8)))];
        else if (selector.indexOf("find ") === 0) return [find(elt, normalizeSelector(selector.substr(5)))];
        else if (selector.indexOf("next ") === 0) return [scanForwardQuery(elt, normalizeSelector(selector.substr(5)))];
        else if (selector.indexOf("previous ") === 0) return [scanBackwardsQuery(elt, normalizeSelector(selector.substr(9)))];
        else if (selector === 'document') return [document];
        else if (selector === 'window') return [window];
        return getDocument().querySelectorAll(normalizeSelector(selector));
    }
    let scanForwardQuery = function(start, match) {
        let results = getDocument().querySelectorAll(match);
        for (let i = 0; i < results.length; i++) {
            let elt = results[i];
            if (elt.compareDocumentPosition(start) === Node.DOCUMENT_POSITION_PRECEDING) return elt;
        }
    }
    let scanBackwardsQuery = function(start, match) {
        let results = getDocument().querySelectorAll(match);
        for (let i = results.length - 1; i >= 0; i--) {
            let elt = results[i];
            if (elt.compareDocumentPosition(start) === Node.DOCUMENT_POSITION_FOLLOWING) return elt;
        }
    }
    function querySelectorExt(eltOrSelector, selector) {
        if (selector) return querySelectorAllExt(eltOrSelector, selector)[0];
        return querySelectorAllExt(getDocument().body, eltOrSelector)[0];
    }
    function resolveTarget(arg2) {
        if (isType(arg2, 'String')) return find(arg2);
        return arg2;
    }
    function processEventArgs(arg1, arg2, arg3) {
        if (isFunction(arg2)) return {target: getDocument().body, event: arg1, listener: arg2}
        return {target: resolveTarget(arg1), event: arg2, listener: arg3}
    }
    function addEventListenerImpl(arg1, arg2, arg3) {
        ready(function(){
            let eventArgs = processEventArgs(arg1, arg2, arg3);
            eventArgs.target.addEventListener(eventArgs.event, eventArgs.listener);
        })
        let b = isFunction(arg2);
        return b ? arg2 : arg3;
    }
    function removeEventListenerImpl(arg1, arg2, arg3) {
        ready(function(){
            let eventArgs = processEventArgs(arg1, arg2, arg3);
            eventArgs.target.removeEventListener(eventArgs.event, eventArgs.listener);
        })
        return isFunction(arg2) ? arg2 : arg3;
    }
    //====================================================================
    // Node processing
    //====================================================================
    let DUMMY_ELT = getDocument().createElement("output"); // dummy element for bad selectors
    function findAttributeTargets(elt, attrName) {
        let attrTarget = getClosestAttributeValue(elt, attrName);
        if (attrTarget) {
            if (attrTarget === "this") return [findThisElement(elt, attrName)];
            else {
                let result = querySelectorAllExt(elt, attrTarget);
                if (result.length === 0) {
                    logError('The selector "' + attrTarget + '" on ' + attrName + " returned no matches!");
                    return [DUMMY_ELT]
                }
                return result;
            }
        }
    }
    function findThisElement(elt, attribute){
        return getClosestMatch(elt, (elt) => { return getAttributeValue(elt, attribute) != null; });
    }
    function getTarget(elt) {
        let targetStr = getClosestAttributeValue(elt, "hx-target");
        if (targetStr) {
            if (targetStr === "this") return findThisElement(elt,'hx-target');
            return querySelectorExt(elt, targetStr)
        } else {
            let data = getInternalData(elt);
            if (data.boosted) return getDocument().body;
            return elt;
        }
    }
    function shouldSettleAttribute(name) {
        let attributesToSettle = htmx.config.attributesToSettle;
        for (let i = 0; i < attributesToSettle.length; i++) {
            if (name === attributesToSettle[i]) return true;
        }
        return false;
    }
    function cloneAttributes(mergeTo, mergeFrom) {
        forEach(mergeTo.attributes, function (attr) {
            if (!mergeFrom.hasAttribute(attr.name) && shouldSettleAttribute(attr.name)) mergeTo.removeAttribute(attr.name);
        });
        forEach(mergeFrom.attributes, function (attr) {
            if (shouldSettleAttribute(attr.name)) mergeTo.setAttribute(attr.name, attr.value);
        });
    }
    function isInlineSwap(swapStyle, target) {
        let extensions = getExtensions(target);
        for (let i = 0; i < extensions.length; i++) {
            let extension = extensions[i];
            try {
                if (extension.isInlineSwap(swapStyle)) return true;
            } catch(e) {
                logError(e);
            }
        }
        return swapStyle === "outerHTML";
    }
    /**
     * @param {string} oobValue
     * @param {HTMLElement} oobElement
     * @param {*} settleInfo
     * @returns
     */
    function oobSwap(oobValue, oobElement, settleInfo) {
        let selector = "#" + oobElement.id, swapStyle = "outerHTML";
        if (oobValue === "true") {
            // do nothing
        } else if (oobValue.indexOf(":") > 0) {
            swapStyle = oobValue.substr(0, oobValue.indexOf(":"));
            selector  = oobValue.substr(oobValue.indexOf(":") + 1, oobValue.length);
        } else swapStyle = oobValue;
        let targets = getDocument().querySelectorAll(selector);
        if (targets) {
            forEach(targets, function (target) {
                let fragment, oobElementClone = oobElement.cloneNode(true);
                fragment = getDocument().createDocumentFragment();
                fragment.appendChild(oobElementClone);
                if (!isInlineSwap(swapStyle, target)) fragment = oobElementClone; // if this is not an inline swap, we use the content of the node, not the node itself
                let beforeSwapDetails = {shouldSwap: true, target: target, fragment:fragment };
                if (!triggerEvent(target, 'htmx:oobBeforeSwap', beforeSwapDetails)) return;
                target = beforeSwapDetails.target; // allow re-targeting
                if (beforeSwapDetails['shouldSwap']) swap(swapStyle, target, target, fragment, settleInfo);
                forEach(settleInfo.elts, (elt) => { triggerEvent(elt, 'htmx:oobAfterSwap', beforeSwapDetails); });
            });
            oobElement.parentNode.removeChild(oobElement);
        } else {
            oobElement.parentNode.removeChild(oobElement);
            triggerErrorEvent(getDocument().body, "htmx:oobErrorNoTarget", {content: oobElement});
        }
        return oobValue;
    }
    function handleOutOfBandSwaps(elt, fragment, settleInfo) {
        let oobSelects = getClosestAttributeValue(elt, "hx-select-oob");
        if (oobSelects) {
            let oobSelectValues = oobSelects.split(",");
            for (let i = 0; i < oobSelectValues.length; i++) {
                let oobSelectValue = oobSelectValues[i].split(":", 2), id = oobSelectValue[0].trim();
                if (id.indexOf("#") === 0) id = id.substring(1);
                let oobValue = oobSelectValue[1] || "true", oobElement = fragment.querySelector("#" + id);
                if (oobElement) oobSwap(oobValue, oobElement, settleInfo);
            }
        }
        forEach(findAll(fragment, '[hx-swap-oob], [data-hx-swap-oob]'), function (oobElement) {
            let oobValue = getAttributeValue(oobElement, "hx-swap-oob");
            if (oobValue != null) oobSwap(oobValue, oobElement, settleInfo);
        });
    }
    function handlePreservedElements(fragment) {
        forEach(findAll(fragment, '[hx-preserve], [data-hx-preserve]'), function (preservedElt) {
            let id = getAttributeValue(preservedElt, "id"), oldElt = getDocument().getElementById(id);
            if (oldElt != null) preservedElt.parentNode.replaceChild(oldElt, preservedElt);
        });
    }
    function handleAttributes(parentNode, fragment, settleInfo) {
        forEach(fragment.querySelectorAll("[id]"), function (newNode) {
            if (newNode.id && newNode.id.length > 0) {
                let normalizedId = newNode.id.replace("'", "\\'"), normalizedTag = newNode.tagName.replace(':', '\\:'),
                    oldNode = parentNode.querySelector(normalizedTag + "[id='" + normalizedId + "']");
                if (oldNode && oldNode !== parentNode) {
                    let newAttributes = newNode.cloneNode();
                    cloneAttributes(newNode, oldNode);
                    settleInfo.tasks.push(() => { cloneAttributes(newNode, newAttributes); });
                }
            }
        });
    }
    function makeAjaxLoadTask(child) {
        return function () {
            removeClassFromElement(child, htmx.config.addedClass);
            processNode(child);
            processScripts(child);
            processFocus(child)
            triggerEvent(child, 'htmx:load');
        };
    }
    function processFocus(child) {
        let autofocus = "[autofocus]", autoFocusedElt = matches(child, autofocus) ? child : child.querySelector(autofocus)
        if (autoFocusedElt != null) autoFocusedElt.focus();
    }
    function insertNodesBefore(parentNode, insertBefore, fragment, settleInfo) {
        handleAttributes(parentNode, fragment, settleInfo);
        while(fragment.childNodes.length > 0){
            let child = fragment.firstChild;
            addClassToElement(child, htmx.config.addedClass);
            parentNode.insertBefore(child, insertBefore);
            if (child.nodeType !== Node.TEXT_NODE && child.nodeType !== Node.COMMENT_NODE) settleInfo.tasks.push(makeAjaxLoadTask(child));
        }
    }
    // based on https://gist.github.com/hyamamoto/fd435505d29ebfa3d9716fd2be8d42f0, derived from Java's string hashcode implementation
    function stringHash(string, hash) {
        let char = 0;
        while (char < string.length){
            hash = (hash << 5) - hash + string.charCodeAt(char++) | 0; // bitwise or ensures we have a 32-bit int
        }
        return hash;
    }
    function attributeHash(elt) {
        let hash = 0;
        // IE fix
        if (elt.attributes) {
            for (let i = 0; i < elt.attributes.length; i++) {
                let attribute = elt.attributes[i];
                if(attribute.value){ // only include attributes w/ actual values (empty is same as non-existent)
                    hash = stringHash(attribute.name, hash);
                    hash = stringHash(attribute.value, hash);
                }
            }
        }
        return hash;
    }
    function deInitNode(element) {
        let internalData = getInternalData(element);
        if (internalData.timeout) clearTimeout(internalData.timeout);
        if (internalData.webSocket) internalData.webSocket.close();
        if (internalData.sseEventSource) internalData.sseEventSource.close();
        if (internalData.listenerInfos) {
            forEach(internalData.listenerInfos, function (info) {
                if (info.on) info.on.removeEventListener(info.trigger, info.listener);
            });
        }
        if (internalData.onHandlers) {
            for (let eventName of internalData.onHandlers) {
                element.removeEventListener(eventName, internalData.onHandlers[eventName]);
            }
        }
    }
    function cleanUpElement(element) {
        triggerEvent(element, "htmx:beforeCleanupElement")
        deInitNode(element);
        if (element.children) forEach(element.children, function(child) { cleanUpElement(child) });
    }
    function swapOuterHTML(target, fragment, settleInfo) {
        if (target.tagName === "BODY") return swapInnerHTML(target, fragment, settleInfo);
        else {
            // @type {HTMLElement}
            let newElt, eltBeforeNewContent = target.previousSibling;
            insertNodesBefore(parentElt(target), target, fragment, settleInfo);
            if (eltBeforeNewContent == null) newElt = parentElt(target).firstChild;
            else newElt = eltBeforeNewContent.nextSibling;
            getInternalData(target).replacedWith = newElt; // tuck away so we can fire events on it later
            settleInfo.elts = [] // clear existing elements
            while(newElt && newElt !== target) {
                if (newElt.nodeType === Node.ELEMENT_NODE) settleInfo.elts.push(newElt);
                newElt = newElt.nextElementSibling;
            }
            cleanUpElement(target);
            parentElt(target).removeChild(target);
        }
    }
    function swapAfterBegin(target, fragment, settleInfo) {
        return insertNodesBefore(target, target.firstChild, fragment, settleInfo);
    }
    function swapBeforeBegin(target, fragment, settleInfo) {
        return insertNodesBefore(parentElt(target), target, fragment, settleInfo);
    }
    function swapBeforeEnd(target, fragment, settleInfo) {
        return insertNodesBefore(target, null, fragment, settleInfo);
    }
    function swapAfterEnd(target, fragment, settleInfo) {
        return insertNodesBefore(parentElt(target), target.nextSibling, fragment, settleInfo);
    }
    function swapDelete(target, fragment, settleInfo) {
        cleanUpElement(target);
        return parentElt(target).removeChild(target);
    }
    function swapInnerHTML(target, fragment, settleInfo) {
        let firstChild = target.firstChild;
        insertNodesBefore(target, firstChild, fragment, settleInfo);
        if (firstChild) {
            while (firstChild.nextSibling) {
                cleanUpElement(firstChild.nextSibling)
                target.removeChild(firstChild.nextSibling);
            }
            cleanUpElement(firstChild)
            target.removeChild(firstChild);
        }
    }
    function maybeSelectFromResponse(elt, fragment) {
        let selector = getClosestAttributeValue(elt, "hx-select");
        if (selector) {
            let newFragment = getDocument().createDocumentFragment();
            forEach(fragment.querySelectorAll(selector), function (node) {
                newFragment.appendChild(node);
            });
            fragment = newFragment;
        }
        return fragment;
    }
    function swap(swapStyle, elt, target, fragment, settleInfo) {
        switch (swapStyle) {
            case "none": return;
            case "outerHTML": swapOuterHTML(target, fragment, settleInfo); return;
            case "afterbegin": swapAfterBegin(target, fragment, settleInfo); return;
            case "beforebegin": swapBeforeBegin(target, fragment, settleInfo); return;
            case "beforeend": swapBeforeEnd(target, fragment, settleInfo); return;
            case "afterend": swapAfterEnd(target, fragment, settleInfo); return;
            case "delete": swapDelete(target, fragment, settleInfo); return;
            default:
                let extensions = getExtensions(elt);
                for (let i = 0; i < extensions.length; i++) {
                    let ext = extensions[i];
                    try {
                        let newElements = ext.handleSwap(swapStyle, target, fragment, settleInfo);
                        if (newElements) {
                            if (typeof newElements.length !== 'undefined') {
                                // if handleSwap returns an array (like) of elements, we handle them
                                for (let j = 0; j < newElements.length; j++) {
                                    let child = newElements[j];
                                    if (child.nodeType !== Node.TEXT_NODE && child.nodeType !== Node.COMMENT_NODE) settleInfo.tasks.push(makeAjaxLoadTask(child));
                                }
                            }
                            return;
                        }
                    } catch (e) {
                        logError(e);
                    }
                }
                if (swapStyle === "innerHTML") swapInnerHTML(target, fragment, settleInfo);
                else swap(htmx.config.defaultSwapStyle, elt, target, fragment, settleInfo);
        }
    }
    function findTitle(content) {
        if (content.indexOf('<title') > -1) {
            let contentWithSvgsRemoved = content.replace(/<svg(\s[^>]*>|>)([\s\S]*?)<\/svg>/gim, '');
            let result = contentWithSvgsRemoved.match(/<title(\s[^>]*>|>)([\s\S]*?)<\/title>/im);
            if (result) return result[2];
        }
    }
    function selectAndSwap(swapStyle, target, elt, responseText, settleInfo) {
        settleInfo.title = findTitle(responseText);
        let fragment = makeFragment(responseText);
        if (fragment) {
            handleOutOfBandSwaps(elt, fragment, settleInfo);
            fragment = maybeSelectFromResponse(elt, fragment);
            handlePreservedElements(fragment);
            return swap(swapStyle, elt, target, fragment, settleInfo);
        }
    }
    function handleTrigger(xhr, header, elt) {
        let triggerBody = xhr.getResponseHeader(header);
        if (triggerBody.indexOf("{") === 0) {
            let triggers = parseJSON(triggerBody);
            for (let eventName in triggers) {
                if (triggers.hasOwnProperty(eventName)) {
                    let detail = triggers[eventName];
                    if (!isRawObject(detail)) detail = {"value": detail}
                    triggerEvent(elt, eventName, detail);
                }
            }
        } else triggerEvent(elt, triggerBody, []);
    }
    let WHITESPACE = /\s/, WHITESPACE_OR_COMMA = /[\s,]/, SYMBOL_START = /[_$a-zA-Z]/,
        SYMBOL_CONT = /[_$a-zA-Z0-9]/, STRINGISH_START = ['"', "'", "/"], NOT_WHITESPACE = /[^\s]/;
    function tokenizeString(str) {
        let tokens = [], position = 0;
        while (position < str.length) {
            if(SYMBOL_START.exec(str.charAt(position))) {
                let startPosition = position;
                while (SYMBOL_CONT.exec(str.charAt(position + 1))) {
                    position++;
                }
                tokens.push(str.substr(startPosition, position - startPosition + 1));
            } else if (STRINGISH_START.indexOf(str.charAt(position)) !== -1) {
                let startChar = str.charAt(position), startPosition = position;
                position++;
                while (position < str.length && str.charAt(position) !== startChar ) {
                    if (str.charAt(position) === "\\") position++;
                    position++;
                }
                tokens.push(str.substr(startPosition, position - startPosition + 1));
            } else {
                let symbol = str.charAt(position);
                tokens.push(symbol);
            }
            position++;
        }
        return tokens;
    }
    function isPossibleRelativeReference(token, last, paramName) {
        return SYMBOL_START.exec(token.charAt(0)) && token !== "true" && token !== "false" && token !== "this" && token !== paramName && last !== ".";
    }
    function maybeGenerateConditional(elt, tokens, paramName) {
        if (tokens[0] === '[') {
            tokens.shift();
            let bracketCount = 1, conditionalSource = " return (function(" + paramName + "){ return (", last = null;
            while (tokens.length > 0) {
                let token = tokens[0];
                if (token === "]") {
                    bracketCount--;
                    if (bracketCount === 0) {
                        if (last === null) conditionalSource = conditionalSource + "true";
                        tokens.shift();
                        conditionalSource += ")})";
                        try {
                            let conditionFunction = maybeEval(elt,() => { return Function(conditionalSource)(); }, () => {return true});
                            conditionFunction.source = conditionalSource;
                            return conditionFunction;
                        } catch (e) {
                            triggerErrorEvent(getDocument().body, "htmx:syntax:error", {error:e, source:conditionalSource})
                            return null;
                        }
                    }
                } else if (token === "[") bracketCount++;
                if (isPossibleRelativeReference(token, last, paramName)) conditionalSource += "((" + paramName + "." + token + ") ? (" + paramName + "." + token + ") : (window." + token + "))";
                else conditionalSource = conditionalSource + token;
                last = tokens.shift();
            }
        }
    }
    function consumeUntil(tokens, match) {
        let result = "";
        while (tokens.length > 0 && !tokens[0].match(match)) {
            result += tokens.shift();
        }
        return result;
    }
    let INPUT_SELECTOR = 'input, textarea, select';
    /**
     * @param {HTMLElement} elt
     * @returns {import("./htmx").HtmxTriggerSpecification[]}
     */
    function getTriggerSpecs(elt) {
        let explicitTrigger = getAttributeValue(elt, 'hx-trigger'), triggerSpecs = [];
        if (explicitTrigger) {
            let tokens = tokenizeString(explicitTrigger);
            do {
                consumeUntil(tokens, NOT_WHITESPACE);
                let initialLength = tokens.length, trigger = consumeUntil(tokens, /[,\[\s]/);
                if (trigger !== "") {
                    if (trigger === "every") {
                        let every = {trigger: 'every'};
                        consumeUntil(tokens, NOT_WHITESPACE);
                        every.pollInterval = parseInterval(consumeUntil(tokens, /[,\[\s]/));
                        consumeUntil(tokens, NOT_WHITESPACE);
                        let eventFilter = maybeGenerateConditional(elt, tokens, "event");
                        if (eventFilter) every.eventFilter = eventFilter;
                        triggerSpecs.push(every);
                    } else if (trigger.indexOf("sse:") === 0) triggerSpecs.push({trigger: 'sse', sseEvent: trigger.substr(4)});
                    else {
                        let triggerSpec = {trigger: trigger}, eventFilter = maybeGenerateConditional(elt, tokens, "event");
                        if (eventFilter) triggerSpec.eventFilter = eventFilter;
                        while (tokens.length > 0 && tokens[0] !== ",") {
                            consumeUntil(tokens, NOT_WHITESPACE)
                            let token = tokens.shift();
                            if (token === "changed") triggerSpec.changed = true;
                            else if (token === "once") triggerSpec.once = true;
                            else if (token === "consume") triggerSpec.consume = true;
                            else if (token === "delay" && tokens[0] === ":") {
                                tokens.shift();
                                triggerSpec.delay = parseInterval(consumeUntil(tokens, WHITESPACE_OR_COMMA));
                            } else if (token === "from" && tokens[0] === ":") {
                                tokens.shift();
                                let from_arg = consumeUntil(tokens, WHITESPACE_OR_COMMA);
                                if (from_arg === "closest" || from_arg === "find" || from_arg === "next" || from_arg === "previous") {
                                    tokens.shift();
                                    from_arg += " " + consumeUntil(tokens, WHITESPACE_OR_COMMA);
                                }
                                triggerSpec.from = from_arg;
                            } else if (token === "target" && tokens[0] === ":") {
                                tokens.shift();
                                triggerSpec.target = consumeUntil(tokens, WHITESPACE_OR_COMMA);
                            } else if (token === "throttle" && tokens[0] === ":") {
                                tokens.shift();
                                triggerSpec.throttle = parseInterval(consumeUntil(tokens, WHITESPACE_OR_COMMA));
                            } else if (token === "queue" && tokens[0] === ":") {
                                tokens.shift();
                                triggerSpec.queue = consumeUntil(tokens, WHITESPACE_OR_COMMA);
                            } else if ((token === "root" || token === "threshold") && tokens[0] === ":") {
                                tokens.shift();
                                triggerSpec[token] = consumeUntil(tokens, WHITESPACE_OR_COMMA);
                            } else triggerErrorEvent(elt, "htmx:syntax:error", {token:tokens.shift()});
                        }
                        triggerSpecs.push(triggerSpec);
                    }
                }
                if (tokens.length === initialLength) triggerErrorEvent(elt, "htmx:syntax:error", {token:tokens.shift()});
                consumeUntil(tokens, NOT_WHITESPACE);
            } while (tokens[0] === "," && tokens.shift())
        }
        if (triggerSpecs.length > 0) return triggerSpecs;
        else if (matches(elt, 'form')) return [{trigger: 'submit'}];
        else if (matches(elt, 'input[type="button"]')) return [{trigger: 'click'}];
        else if (matches(elt, INPUT_SELECTOR)) return [{trigger: 'change'}];
        return [{trigger: 'click'}];
    }
    function cancelPolling(elt) {
        getInternalData(elt).cancelled = true;
    }
    function processPolling(elt, handler, spec) {
        let nodeData = getInternalData(elt);
        nodeData.timeout = setTimeout(function () {
            if (bodyContains(elt) && nodeData.cancelled !== true) {
                if (!maybeFilterEvent(spec, makeEvent('hx:poll:trigger', {triggerSpec:spec, target:elt}))) handler(elt);
                processPolling(elt, handler, spec);
            }
        }, spec.pollInterval);
    }
    function isLocalLink(elt) {
        return location.hostname === elt.hostname && getRawAttribute(elt,'href') && getRawAttribute(elt,'href').indexOf("#") !== 0;
    }
    function boostElement(elt, nodeData, triggerSpecs) {
        if ((elt.tagName === "A" && isLocalLink(elt) && (elt.target === "" || elt.target === "_self")) || elt.tagName === "FORM") {
            nodeData.boosted = true;
            let verb, path;
            if (elt.tagName === "A") {
                verb = "get";
                path = getRawAttribute(elt, 'href');
            } else {
                let rawAttribute = getRawAttribute(elt, "method");
                verb = rawAttribute ? rawAttribute.toLowerCase() : "get";
                if (verb === "get") {}
                path = getRawAttribute(elt, 'action');
            }
            triggerSpecs.forEach(function(triggerSpec) {
                addEventListener(elt, function(elt, evt) {
                    issueAjaxRequest(verb, path, elt, evt)
                }, nodeData, triggerSpec, true);
            });
        }
    }
    /**
     * @param {Event} evt
     * @param {HTMLElement} elt
     * @returns
     */
    function shouldCancel(evt, elt) {
        if (evt.type === "submit" || evt.type === "click") {
            if (elt.tagName === "FORM") return true;
            if (matches(elt, 'input[type="submit"], button') && closest(elt, 'form') !== null) return true;
            if (elt.tagName === "A" && elt.href && (elt.getAttribute('href') === '#' || elt.getAttribute('href').indexOf("#") !== 0)) return true;
        }
        return false;
    }
    function ignoreBoostedAnchorCtrlClick(elt, evt) {
        return getInternalData(elt).boosted && elt.tagName === "A" && evt.type === "click" && (evt.ctrlKey || evt.metaKey);
    }
    function maybeFilterEvent(triggerSpec, evt) {
        let eventFilter = triggerSpec.eventFilter;
        if (eventFilter) {
            try {
                return eventFilter(evt) !== true;
            } catch(e) {
                triggerErrorEvent(getDocument().body, "htmx:eventFilter:error", {error: e, source:eventFilter.source});
                return true;
            }
        }
        return false;
    }
    function addEventListener(elt, handler, nodeData, triggerSpec, explicitCancel) {
        let elementData = getInternalData(elt), eltsToListenOn;
        if (triggerSpec.from) eltsToListenOn = querySelectorAllExt(elt, triggerSpec.from);
        else eltsToListenOn = [elt];
        // store the initial value of the element so we can tell if it changes
        if (triggerSpec.changed) elementData.lastValue = elt.value;
        forEach(eltsToListenOn, function (eltToListenOn) {
            let eventListener = function (evt) {
                if (!bodyContains(elt)) {
                    eltToListenOn.removeEventListener(triggerSpec.trigger, eventListener);
                    return;
                }
                if (ignoreBoostedAnchorCtrlClick(elt, evt)) return;
                if (explicitCancel || shouldCancel(evt, elt)) evt.preventDefault();
                if (maybeFilterEvent(triggerSpec, evt)) return;
                let eventData = getInternalData(evt);
                eventData.triggerSpec = triggerSpec;
                if (eventData.handledFor == null) eventData.handledFor = [];
                if (eventData.handledFor.indexOf(elt) < 0) {
                    eventData.handledFor.push(elt);
                    if (triggerSpec.consume) evt.stopPropagation();
                    if (triggerSpec.target && evt.target) {
                        if (!matches(evt.target, triggerSpec.target)) return;
                    }
                    if (triggerSpec.once) {
                        if (elementData.triggeredOnce) return;
                        else elementData.triggeredOnce = true;
                    }
                    if (triggerSpec.changed) {
                        if (elementData.lastValue === elt.value) return;
                        else elementData.lastValue = elt.value;
                    }
                    if (elementData.delayed) clearTimeout(elementData.delayed);
                    if (elementData.throttle) return;
                    if (triggerSpec.throttle) {
                        if (!elementData.throttle) {
                            handler(elt, evt);
                            elementData.throttle = setTimeout(function () {
                                elementData.throttle = null;
                            }, triggerSpec.throttle);
                        }
                    } else if (triggerSpec.delay) elementData.delayed = setTimeout(function() { handler(elt, evt) }, triggerSpec.delay);
                    else {
                        triggerEvent(elt, 'htmx:trigger')
                        handler(elt, evt);
                    }
                }
            };
            if (nodeData.listenerInfos == null) nodeData.listenerInfos = [];
            nodeData.listenerInfos.push({trigger: triggerSpec.trigger, listener: eventListener, on: eltToListenOn})
            eltToListenOn.addEventListener(triggerSpec.trigger, eventListener);
        });
    }
    let windowIsScrolling = false, scrollHandler = null;
    function initScrollHandler() {
        if (!scrollHandler) {
            scrollHandler = function() {
                windowIsScrolling = true
            };
            window.addEventListener("scroll", scrollHandler)
            setInterval(function() {
                if (windowIsScrolling) {
                    windowIsScrolling = false;
                    forEach(getDocument().querySelectorAll("[hx-trigger='revealed'],[data-hx-trigger='revealed']"), function (elt) {
                        maybeReveal(elt);
                    })
                }
            }, 200);
        }
    }
    function maybeReveal(elt) {
        if (!hasAttribute(elt,'data-hx-revealed') && isScrolledIntoView(elt)) {
            elt.setAttribute('data-hx-revealed', 'true');
            let nodeData = getInternalData(elt);
            if (nodeData.initHash) triggerEvent(elt, 'revealed');
            // if the node isn't initialized, wait for it before triggering the request
            else elt.addEventListener("htmx:afterProcessNode", function(evt) { triggerEvent(elt, 'revealed') }, {once: true});
        }
    }
    //====================================================================
    // Web Sockets
    //====================================================================
    function processWebSocketInfo(elt, nodeData, info) {
        let values = splitOnWhitespace(info);
        for (let i = 0; i < values.length; i++) {
            let value = values[i].split(/:(.+)/);
            if (value[0] === "connect") ensureWebSocket(elt, value[1], 0);
            if (value[0] === "send") processWebSocketSend(elt);
        }
    }
    function ensureWebSocket(elt, wssSource, retryCount) {
        if (!bodyContains(elt)) return;  // stop ensuring websocket connection when socket bearing element ceases to exist
        if (wssSource.indexOf("/") === 0) {  // complete absolute paths only
            let base_part = location.hostname + (location.port ? ':'+location.port: '');
            if (location.protocol === 'https:') wssSource = "wss://" + base_part + wssSource;
            else if (location.protocol === 'http:') wssSource = "ws://" + base_part + wssSource;
        }
        let socket = htmx.createWebSocket(wssSource);
        socket.onerror = function (e) {
            triggerErrorEvent(elt, "htmx:wsError", {error:e, socket:socket});
            maybeCloseWebSocketSource(elt);
        };
        socket.onclose = function (e) {
            if ([1006, 1012, 1013].indexOf(e.code) >= 0) {  // Abnormal Closure/Service Restart/Try Again Later
                let delay = getWebSocketReconnectDelay(retryCount);
                setTimeout(function() {
                    ensureWebSocket(elt, wssSource, retryCount+1);  // creates a websocket with a new timeout
                }, delay);
            }
        };
        socket.onopen = function (e) {
            retryCount = 0;
        }
        getInternalData(elt).webSocket = socket;
        socket.addEventListener('message', function (event) {
            if (maybeCloseWebSocketSource(elt)) return;
            let response = event.data;
            withExtensions(elt, function(extension){
                response = extension.transformResponse(response, null, elt);
            });
            let settleInfo = makeSettleInfo(elt), fragment = makeFragment(response), children = toArray(fragment.children);
            for (let i = 0; i < children.length; i++) {
                let child = children[i];
                oobSwap(getAttributeValue(child, "hx-swap-oob") || "true", child, settleInfo);
            }
            settleImmediately(settleInfo.tasks);
        });
    }
    function maybeCloseWebSocketSource(elt) {
        if (!bodyContains(elt)) {
            getInternalData(elt).webSocket.close();
            return true;
        }
    }
    function processWebSocketSend(elt) {
        let webSocketSourceElt = getClosestMatch(elt, function (parent) {
            return getInternalData(parent).webSocket != null;
        });
        if (webSocketSourceElt) {
            elt.addEventListener(getTriggerSpecs(elt)[0].trigger, function (evt) {
                let webSocket = getInternalData(webSocketSourceElt).webSocket;
                let headers = getHeaders(elt, webSocketSourceElt);
                let results = getInputValues(elt, 'post');
                let errors = results.errors;
                let rawParameters = results.values;
                let expressionVars = getExpressionVars(elt);
                let allParameters = mergeObjects(rawParameters, expressionVars);
                let filteredParameters = filterValues(allParameters, elt);
                filteredParameters['HEADERS'] = headers;
                if (errors && errors.length > 0) {
                    triggerEvent(elt, 'htmx:validation:halted', errors);
                    return;
                }
                webSocket.send(JSON.stringify(filteredParameters));
                if (shouldCancel(evt, elt)) evt.preventDefault();
            });
        } else triggerErrorEvent(elt, "htmx:noWebSocketSourceError");
    }
    function getWebSocketReconnectDelay(retryCount) {
        let delay = htmx.config.wsReconnectDelay;
        // @ts-ignore
        if (typeof delay === 'function') return delay(retryCount);
        if (delay === 'full-jitter') {
            let exp = Math.min(retryCount, 6), maxDelay = 1000 * Math.pow(2, exp);
            return maxDelay * Math.random();
        }
        logError('htmx.config.wsReconnectDelay must either be a function or the string "full-jitter"');
    }
    //====================================================================
    // Server Sent Events
    //====================================================================
    function processSSEInfo(elt, nodeData, info) {
        let values = splitOnWhitespace(info);
        for (let i = 0; i < values.length; i++) {
            let value = values[i].split(/:(.+)/);
            if (value[0] === "connect") processSSESource(elt, value[1]);
            if ((value[0] === "swap")) processSSESwap(elt, value[1]);
        }
    }
    function processSSESource(elt, sseSrc) {
        let source = htmx.createEventSource(sseSrc);
        source.onerror = function (e) {
            triggerErrorEvent(elt, "htmx:sseError", {error:e, source:source});
            maybeCloseSSESource(elt);
        };
        getInternalData(elt).sseEventSource = source;
    }
    function processSSESwap(elt, sseEventName) {
        let sseSourceElt = getClosestMatch(elt, hasEventSource);
        if (sseSourceElt) {
            let sseEventSource = getInternalData(sseSourceElt).sseEventSource;
            let sseListener = function (event) {
                if (maybeCloseSSESource(sseSourceElt)) {
                    sseEventSource.removeEventListener(sseEventName, sseListener);
                    return;
                }
                ///////////////////////////
                // TODO: merge this code with AJAX and WebSockets code in the future.
                let response = event.data;
                withExtensions(elt, function(extension){
                    response = extension.transformResponse(response, null, elt);
                });
                let swapSpec = getSwapSpecification(elt), target = getTarget(elt), settleInfo = makeSettleInfo(elt);
                selectAndSwap(swapSpec.swapStyle, elt, target, response, settleInfo)
                settleImmediately(settleInfo.tasks)
                triggerEvent(elt, "htmx:sseMessage", event)
            };
            getInternalData(elt).sseListener = sseListener;
            sseEventSource.addEventListener(sseEventName, sseListener);
        } else triggerErrorEvent(elt, "htmx:noSSESourceError");
    }
    function processSSETrigger(elt, handler, sseEventName) {
        let sseSourceElt = getClosestMatch(elt, hasEventSource);
        if (sseSourceElt) {
            let sseEventSource = getInternalData(sseSourceElt).sseEventSource;
            let sseListener = function () {
                if (!maybeCloseSSESource(sseSourceElt)) {
                    if (bodyContains(elt)) handler(elt);
                    else sseEventSource.removeEventListener(sseEventName, sseListener);
                }
            };
            getInternalData(elt).sseListener = sseListener;
            sseEventSource.addEventListener(sseEventName, sseListener);
        } else triggerErrorEvent(elt, "htmx:noSSESourceError");
    }
    function maybeCloseSSESource(elt) {
        if (!bodyContains(elt)) {
            getInternalData(elt).sseEventSource.close();
            return true;
        }
    }
    function hasEventSource(node) {
        return getInternalData(node).sseEventSource != null;
    }
    //====================================================================
    function loadImmediately(elt, handler, nodeData, delay) {
        let load = function(){
            if (!nodeData.loaded) {
                nodeData.loaded = true;
                handler(elt);
            }
        }
        if (delay) setTimeout(load, delay);
        else load();
    }
    function processVerbs(elt, nodeData, triggerSpecs) {
        let explicitAction = false;
        forEach(VERBS, function (verb) {
            if (hasAttribute(elt,'hx-' + verb)) {
                let path = getAttributeValue(elt, 'hx-' + verb);
                explicitAction = true;
                nodeData.path = path;
                nodeData.verb = verb;
                triggerSpecs.forEach(function(triggerSpec) {
                    addTriggerHandler(elt, triggerSpec, nodeData, function (elt, evt) {
                        issueAjaxRequest(verb, path, elt, evt)
                    })
                });
            }
        });
        if (!explicitAction && hasAttribute(elt, 'hx-trigger')) {
            explicitAction = true
            triggerSpecs.forEach(function(triggerSpec) {
                // For "naked" triggers, don't do anything at all
                addTriggerHandler(elt, triggerSpec, nodeData, function () { })
            })
        }
        return explicitAction;
    }
    function addTriggerHandler(elt, triggerSpec, nodeData, handler) {
        if (triggerSpec.sseEvent) processSSETrigger(elt, handler, triggerSpec.sseEvent);
        else if (triggerSpec.trigger === "revealed") {
            initScrollHandler();
            addEventListener(elt, handler, nodeData, triggerSpec);
            maybeReveal(elt);
        } else if (triggerSpec.trigger === "intersect") {
            let observerOptions = {};
            if (triggerSpec.root) observerOptions.root = querySelectorExt(elt, triggerSpec.root)
            if (triggerSpec.threshold) observerOptions.threshold = parseFloat(triggerSpec.threshold);
            let observer = new IntersectionObserver(function (entries) {
                for (let i = 0; i < entries.length; i++) {
                    let entry = entries[i];
                    if (entry.isIntersecting) {
                        triggerEvent(elt, "intersect");
                        break;
                    }
                }
            }, observerOptions);
            observer.observe(elt);
            addEventListener(elt, handler, nodeData, triggerSpec);
        } else if (triggerSpec.trigger === "load") {
            if (!maybeFilterEvent(triggerSpec, makeEvent("load", {elt:elt}))) loadImmediately(elt, handler, nodeData, triggerSpec.delay);
        } else if (triggerSpec.pollInterval) {
            nodeData.polling = true;
            processPolling(elt, handler, triggerSpec);
        } else addEventListener(elt, handler, nodeData, triggerSpec);
    }
    function evalScript(script) {
        if (script.type === "text/javascript" || script.type === "module" || script.type === "") {
            let newScript = getDocument().createElement("script");
            forEach(script.attributes, (attr) => { newScript.setAttribute(attr.name, attr.value); });
            newScript.textContent = script.textContent;
            newScript.async = false;
            if (htmx.config.inlineScriptNonce) newScript.nonce = htmx.config.inlineScriptNonce;
            let parent = script.parentElement;
            try {
                parent.insertBefore(newScript, script);
            } catch (e) {
                logError(e);
            } finally {
                // remove old script element, but only if it is still in DOM
                if (script.parentElement) script.parentElement.removeChild(script);
            }
        }
    }
    function processScripts(elt) {
        if (matches(elt, "script")) evalScript(elt);
        forEach(findAll(elt, "script"), (script) => { evalScript(script); });
    }
    function hasChanceOfBeingBoosted() {
        return document.querySelector("[hx-boost], [data-hx-boost]");
    }
    function findElementsToProcess(elt) {
        if (elt.querySelectorAll) {
            let boostedElts = hasChanceOfBeingBoosted() ? ", a, form" : "";
            return elt.querySelectorAll(VERB_SELECTOR + boostedElts + ", [hx-sse], [data-hx-sse], [hx-ws]," +
                    " [data-hx-ws], [hx-ext], [data-hx-ext], [hx-trigger], [data-hx-trigger], [hx-on], [data-hx-on]");
        }
        return [];
    }
    function initButtonTracking(form){
        let maybeSetLastButtonClicked = function(evt){
            let elt = closest(evt.target, "button, input[type='submit']");
            if (elt !== null) {
                let internalData = getInternalData(form);
                internalData.lastButtonClicked = elt;
            }
        };
        // need to handle both click and focus in:
        //   focusin - in case someone tabs in to a button and hits the space bar
        //   click - on OSX buttons do not focus on click see https://bugs.webkit.org/show_bug.cgi?id=13724
        form.addEventListener('click', maybeSetLastButtonClicked)
        form.addEventListener('focusin', maybeSetLastButtonClicked)
        form.addEventListener('focusout', function(evt){
            let internalData = getInternalData(form);
            internalData.lastButtonClicked = null;
        })
    }
    function countCurlies(line) {
        let tokens = tokenizeString(line), netCurlies = 0;
        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if (token === "{") netCurlies++;
            else if (token === "}") netCurlies--;
        }
        return netCurlies;
    }
    function addHxOnEventHandler(elt, eventName, code) {
        let nodeData = getInternalData(elt);
        nodeData.onHandlers ||= {};
        let func = new Function("event", code + "; return;"), listener = elt.addEventListener(eventName, (e) => { return func.call(elt, e); });
        nodeData.onHandlers[eventName] = listener;
        return {nodeData, code, func, listener};
    }
    function processHxOn(elt) {
        let hxOnValue = getAttributeValue(elt, 'hx-on');
        if (hxOnValue) {
            let handlers = {}, lines = hxOnValue.split("\n"), currentEvent = null, curlyCount = 0;
            while (lines.length > 0) {
                let line = lines.shift(), match = line.match(/^\s*([a-zA-Z:\-]+:)(.*)/);
                if (curlyCount === 0 && match) {
                    line.split(":")
                    currentEvent = match[1].slice(0, -1); // strip last colon
                    handlers[currentEvent] = match[2];
                } else handlers[currentEvent] += line;
                curlyCount += countCurlies(line);
            }
            for (let eventName in handlers) {
                addHxOnEventHandler(elt, eventName, handlers[eventName]);
            }
        }
    }
    function initNode(elt) {
        if (elt.closest && elt.closest(htmx.config.disableSelector)) return;
        let nodeData = getInternalData(elt);
        if (nodeData.initHash !== attributeHash(elt)) {
            nodeData.initHash = attributeHash(elt);
            // clean up any previously processed info
            deInitNode(elt);
            processHxOn(elt);
            triggerEvent(elt, "htmx:beforeProcessNode")
            if (elt.value) nodeData.lastValue = elt.value;
            let triggerSpecs = getTriggerSpecs(elt), explicitAction = processVerbs(elt, nodeData, triggerSpecs);
            if (!explicitAction && getClosestAttributeValue(elt, "hx-boost") === "true") boostElement(elt, nodeData, triggerSpecs);
            if (elt.tagName === "FORM") initButtonTracking(elt);
            let sseInfo = getAttributeValue(elt, 'hx-sse');
            if (sseInfo) processSSEInfo(elt, nodeData, sseInfo);
            let wsInfo = getAttributeValue(elt, 'hx-ws');
            if (wsInfo) processWebSocketInfo(elt, nodeData, wsInfo);
            triggerEvent(elt, "htmx:afterProcessNode");
        }
    }
    function processNode(elt) {
        elt = resolveTarget(elt);
        initNode(elt);
        forEach(findElementsToProcess(elt), function(child) { initNode(child) });
    }
    //====================================================================
    // Event/Log Support
    //====================================================================
    function kebabEventName(str) {
        return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    }
    function makeEvent(eventName, detail) {
        let evt;
        if (window.CustomEvent && typeof window.CustomEvent === 'function') evt = new CustomEvent(eventName, {bubbles: true, cancelable: true, detail: detail});
        else {
            evt = getDocument().createEvent('CustomEvent');
            evt.initCustomEvent(eventName, true, true, detail);
        }
        return evt;
    }
    function triggerErrorEvent(elt, eventName, detail) {
        triggerEvent(elt, eventName, mergeObjects({error:eventName}, detail));
    }
    function ignoreEventForLogging(eventName) {
        return eventName === "htmx:afterProcessNode"
    }
    /**
     * `withExtensions` locates all active extensions for a provided element, then executes the provided function using
     * each of the active extensions. It should be called internally at every extendable execution point in htmx.
     *
     * @param {HTMLElement} elt
     * @param {(extension:import("./htmx").HtmxExtension) => void} toDo
     * @returns void
     */
    function withExtensions(elt, toDo) {
        forEach(getExtensions(elt), function(extension){
            try {
                toDo(extension);
            } catch (e) {
                logError(e);
            }
        });
    }
    function logError(msg) {
        if (console.error) console.error(msg);
        else if (console.log) console.log("ERROR: ", msg);
    }
    function triggerEvent(elt, eventName, detail) {
        elt = resolveTarget(elt);
        if (detail == null) detail = {};
        detail["elt"] = elt;
        let event = makeEvent(eventName, detail);
        if (htmx.logger && !ignoreEventForLogging(eventName)) htmx.logger(elt, eventName, detail);
        if (detail.error) {
            logError(detail.error);
            triggerEvent(elt, "htmx:error", {errorInfo:detail})
        }
        let eventResult = elt.dispatchEvent(event), kebabName = kebabEventName(eventName);
        if (eventResult && kebabName !== eventName) {
            let kebabedEvent = makeEvent(kebabName, event.detail);
            eventResult = eventResult && elt.dispatchEvent(kebabedEvent)
        }
        withExtensions(elt, function (extension) {
            eventResult = eventResult && (extension.onEvent(eventName, event) !== false)
        });
        return eventResult;
    }
    //====================================================================
    // History Support
    //====================================================================
    let currentPathForHistory = location.pathname+location.search;
    function getHistoryElement() {
        let historyElt = getDocument().querySelector('[hx-history-elt],[data-hx-history-elt]');
        return historyElt || getDocument().body;
    }
    function saveToHistoryCache(url, content, title, scroll) {
        if (!canAccessLocalStorage()) return;
        let historyCache = parseJSON(localStorage.getItem("htmx-history-cache")) || [];
        for (let i = 0; i < historyCache.length; i++) {
            if (historyCache[i].url === url) {
                historyCache.splice(i, 1);
                break;
            }
        }
        let newHistoryItem = {url:url, content: content, title:title, scroll:scroll};
        triggerEvent(getDocument().body, "htmx:historyItemCreated", {item:newHistoryItem, cache: historyCache})
        historyCache.push(newHistoryItem)
        while (historyCache.length > htmx.config.historyCacheSize) {
            historyCache.shift();
        }
        while(historyCache.length > 0){
            try {
                localStorage.setItem("htmx-history-cache", JSON.stringify(historyCache));
                break;
            } catch (e) {
                triggerErrorEvent(getDocument().body, "htmx:historyCacheError", {cause:e, cache: historyCache})
                historyCache.shift(); // shrink the cache and retry
            }
        }
    }
    function getCachedHistory(url) {
        if (!canAccessLocalStorage()) return null;
        let historyCache = parseJSON(localStorage.getItem("htmx-history-cache")) || [];
        for (let i = 0; i < historyCache.length; i++) {
            if (historyCache[i].url === url) return historyCache[i];
        }
        return null;
    }
    function cleanInnerHtmlForHistory(elt) {
        let className = htmx.config.requestClass, clone = elt.cloneNode(true);
        forEach(findAll(clone, "." + className), function(child){
            removeClassFromElement(child, className);
        });
        return clone.innerHTML;
    }
    function saveCurrentPageToHistory() {
        let elt = getHistoryElement(), path = currentPathForHistory || location.pathname+location.search;
        // Allow history snapshot feature to be disabled where hx-history="false" is present *anywhere* in the current
        // document we're about to save, so we can prevent privileged data entering the cache. The page will still be
        // reachable as a history entry, but htmx will fetch it live from the server onpopstate rather than look in the localStorage cache
        let disableHistoryCache = getDocument().querySelector('[hx-history="false" i],[data-hx-history="false" i]');
        if (!disableHistoryCache) {
            triggerEvent(getDocument().body, "htmx:beforeHistorySave", {path: path, historyElt: elt});
            saveToHistoryCache(path, cleanInnerHtmlForHistory(elt), getDocument().title, window.scrollY);
        }
        if (htmx.config.historyEnabled) history.replaceState({htmx: true}, getDocument().title, window.location.href);
    }
    function pushUrlIntoHistory(path) {
        // remove the cache buster parameter, if any
        if (htmx.config.getCacheBusterParam) {
            path = path.replace(/org\.htmx\.cache-buster=[^&]*&?/, '')
            if (path.endsWith('&') || path.endsWith("?")) path = path.slice(0, -1);
        }
        if (htmx.config.historyEnabled) history.pushState({htmx:true}, "", path);
        currentPathForHistory = path;
    }
    function replaceUrlInHistory(path) {
        if (htmx.config.historyEnabled)  history.replaceState({htmx:true}, "", path);
        currentPathForHistory = path;
    }
    function settleImmediately(tasks) {
        forEach(tasks, (task) => { task.call(); });
    }
    function loadHistoryFromServer(path) {
        let request = new XMLHttpRequest(), details = {path: path, xhr:request};
        triggerEvent(getDocument().body, "htmx:historyCacheMiss", details);
        request.open('GET', path, true);
        request.setRequestHeader("HX-History-Restore-Request", "true");
        request.onload = function () {
            if (this.status >= 200 && this.status < 400) {
                triggerEvent(getDocument().body, "htmx:historyCacheMissLoad", details);
                let fragment = makeFragment(this.response);
                // @ts-ignore
                fragment = fragment.querySelector('[hx-history-elt],[data-hx-history-elt]') || fragment;
                let historyElement = getHistoryElement(), settleInfo = makeSettleInfo(historyElement), title = findTitle(this.response);
                if (title) {
                    let titleElt = find("title");
                    if (titleElt) titleElt.innerHTML = title;
                    else window.document.title = title;
                }
                // @ts-ignore
                swapInnerHTML(historyElement, fragment, settleInfo)
                settleImmediately(settleInfo.tasks);
                currentPathForHistory = path;
                triggerEvent(getDocument().body, "htmx:historyRestore", {path: path, cacheMiss:true, serverResponse:this.response});
            } else triggerErrorEvent(getDocument().body, "htmx:historyCacheMissLoadError", details);
        };
        request.send();
    }
    function restoreHistory(path) {
        saveCurrentPageToHistory();
        path = path || location.pathname+location.search;
        let cached = getCachedHistory(path);
        if (cached) {
            let fragment = makeFragment(cached.content), historyElement = getHistoryElement(),
                settleInfo = makeSettleInfo(historyElement);
            swapInnerHTML(historyElement, fragment, settleInfo)
            settleImmediately(settleInfo.tasks);
            document.title = cached.title;
            window.scrollTo(0, cached.scroll);
            currentPathForHistory = path;
            triggerEvent(getDocument().body, "htmx:historyRestore", {path:path, item:cached});
        } else {
            // @ts-ignore: optional parameter in reload() function throws error
            if (htmx.config.refreshOnHistoryMiss) window.location.reload(true);
            else loadHistoryFromServer(path);
        }
    }
    function addRequestIndicatorClasses(elt) {
        let indicators = findAttributeTargets(elt, 'hx-indicator');
        if (indicators == null) indicators = [elt];
        forEach(indicators, function (ic) {
            let internalData = getInternalData(ic);
            internalData.requestCount = (internalData.requestCount || 0) + 1;
            ic.classList["add"].call(ic.classList, htmx.config.requestClass);
        });
        return indicators;
    }
    function removeRequestIndicatorClasses(indicators) {
        forEach(indicators, function (ic) {
            let internalData = getInternalData(ic);
            internalData.requestCount = (internalData.requestCount || 0) - 1;
            if (internalData.requestCount === 0) ic.classList["remove"].call(ic.classList, htmx.config.requestClass);
        });
    }
    //====================================================================
    // Input Value Processing
    //====================================================================
    function haveSeenNode(processed, elt) {
        for (let i = 0; i < processed.length; i++) {
            let node = processed[i];
            if (node.isSameNode(elt)) return true;
        }
        return false;
    }
    function shouldInclude(elt) {
        if (elt.name === "" || elt.name == null || elt.disabled) return false;
        // ignore "submitter" types (see jQuery src/serialize.js)
        if (elt.type === "button" || elt.type === "submit" || elt.tagName === "image" || elt.tagName === "reset" || elt.tagName === "file" ) return false;
        if (elt.type === "checkbox" || elt.type === "radio" ) return elt.checked;
        return true;
    }
    function processInputValue(processed, values, errors, elt, validate) {
        if (elt == null || haveSeenNode(processed, elt)) return;
        else processed.push(elt);
        if (shouldInclude(elt)) {
            let name = getRawAttribute(elt,"name"), value = elt.value;
            if (elt.multiple) value = toArray(elt.querySelectorAll("option:checked")).map(function (e) { return e.value });
            // include file inputs
            if (elt.files) value = toArray(elt.files);
            // This is a little ugly because both the current value of the named value in the form and the new value could be arrays, so we have to handle all four cases :/
            if (name != null && value != null) {
                let current = values[name];
                if (current !== undefined) {
                    if (Array.isArray(current)) {
                        if (Array.isArray(value)) values[name] = current.concat(value);
                        else current.push(value);
                    } else {
                        if (Array.isArray(value)) values[name] = [current].concat(value);
                        else values[name] = [current, value];
                    }
                } else values[name] = value;
            }
            if (validate) validateElement(elt, errors);
        }
        if (matches(elt, 'form')) {
            let inputs = elt.elements;
            forEach(inputs, (input) => { processInputValue(processed, values, errors, input, validate); });
        }
    }
    function validateElement(element, errors) {
        if (element.willValidate) {
            triggerEvent(element, "htmx:validation:validate")
            if (!element.checkValidity()) {
                errors.push({elt: element, message:element.validationMessage, validity:element.validity});
                triggerEvent(element, "htmx:validation:failed", {message:element.validationMessage, validity:element.validity})
            }
        }
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} verb
     */
    function getInputValues(elt, verb) {
        let processed = [], values = {}, formValues = {}, errors = [], internalData = getInternalData(elt);
        // only validate when form is directly submitted and novalidate or formnovalidate are not set
        // or if the element has an explicit hx-validate="true" on it
        let validate = (matches(elt, 'form') && elt.noValidate !== true) || getAttributeValue(elt, "hx-validate") === "true";
        if (internalData.lastButtonClicked) validate = validate && internalData.lastButtonClicked.formNoValidate !== true;
        // for a non-GET include the closest form
        if (verb !== 'get') processInputValue(processed, formValues, errors, closest(elt, 'form'), validate);
        // include the element itself
        processInputValue(processed, values, errors, elt, validate);
        // if a button or submit was clicked last, include its value
        if (internalData.lastButtonClicked) {
            let name = getRawAttribute(internalData.lastButtonClicked,"name");
            if (name) values[name] = internalData.lastButtonClicked.value;
        }
        // include any explicit includes
        let includes = findAttributeTargets(elt, "hx-include");
        forEach(includes, function(node) {
            processInputValue(processed, values, errors, node, validate);
            // if a non-form is included, include any input values within it
            if (!matches(node, 'form')) forEach(node.querySelectorAll(INPUT_SELECTOR), (descendant) => { processInputValue(processed, values, errors, descendant, validate); })
        });
        // form values take precedence, overriding the regular values
        values = mergeObjects(values, formValues);
        return {errors:errors, values:values};
    }
    function appendParam(returnStr, name, realValue) {
        if (returnStr !== "") returnStr += "&";
        if (String(realValue) === "[object Object]") realValue = JSON.stringify(realValue);
        let s = encodeURIComponent(realValue);
        returnStr += encodeURIComponent(name) + "=" + s;
        return returnStr;
    }
    function urlEncode(values) {
        let returnStr = "";
        for (let name in values) {
            if (values.hasOwnProperty(name)) {
                let value = values[name];
                if (Array.isArray(value)) forEach(value, (v) => { returnStr = appendParam(returnStr, name, v); });
                else returnStr = appendParam(returnStr, name, value);
            }
        }
        return returnStr;
    }
    function makeFormData(values) {
        let formData = new FormData();
        for (let name in values) {
            if (values.hasOwnProperty(name)) {
                let value = values[name];
                if (Array.isArray(value)) forEach(value, (v) => { formData.append(name, v); });
                else formData.append(name, value);
            }
        }
        return formData;
    }
    //====================================================================
    // Ajax
    //====================================================================
    /**
     * @param {HTMLElement} elt
     * @param {HTMLElement} target
     * @param {string} prompt
     * @returns {Object} // TODO: Define/Improve HtmxHeaderSpecification
     */
    function getHeaders(elt, target, prompt) {
        let headers = {
            "HX-Request" : "true",
            "HX-Trigger" : getRawAttribute(elt, "id"),
            "HX-Trigger-Name" : getRawAttribute(elt, "name"),
            "HX-Target" : getAttributeValue(target, "id"),
            "HX-Current-URL" : getDocument().location.href,
        }
        getValuesForElement(elt, "hx-headers", false, headers)
        if (prompt !== undefined) headers["HX-Prompt"] = prompt;
        if (getInternalData(elt).boosted) headers["HX-Boosted"] = "true";
        return headers;
    }
    /**
     * filterValues takes an object containing form input values and returns a new object that only contains keys that are
     * specified by the closest "hx-params" attribute
     * @param {Object} inputValues
     * @param {HTMLElement} elt
     * @returns {Object}
     */
    function filterValues(inputValues, elt) {
        let paramsValue = getClosestAttributeValue(elt, "hx-params");
        if (paramsValue) {
            if (paramsValue === "none") return {};
            else if (paramsValue === "*") return inputValues;
            else if(paramsValue.indexOf("not ") === 0) {
                forEach(paramsValue.substr(4).split(","), function (name) {
                    name = name.trim();
                    delete inputValues[name];
                });
                return inputValues;
            }
            let newValues = {}
            forEach(paramsValue.split(","), function (name) {
                name = name.trim();
                newValues[name] = inputValues[name];
            });
            return newValues;
        }
        return inputValues;
    }
    function isAnchorLink(elt) {
        return getRawAttribute(elt, 'href') && getRawAttribute(elt, 'href').indexOf("#") >=0
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} swapInfoOverride
     * @returns {import("./htmx").HtmxSwapSpecification}
     */
    function getSwapSpecification(elt, swapInfoOverride) {
        let swapInfo = swapInfoOverride ? swapInfoOverride : getClosestAttributeValue(elt, "hx-swap");
        let swapSpec = {
            "swapStyle" : getInternalData(elt).boosted ? 'innerHTML' : htmx.config.defaultSwapStyle,
            "swapDelay" : htmx.config.defaultSwapDelay,
            "settleDelay" : htmx.config.defaultSettleDelay
        }
        if (getInternalData(elt).boosted && !isAnchorLink(elt)) swapSpec["show"] = "top"
        if (swapInfo) {
            let split = splitOnWhitespace(swapInfo);
            if (split.length > 0) {
                swapSpec["swapStyle"] = split[0];
                for (let i = 1; i < split.length; i++) {
                    let modifier = split[i];
                    if (modifier.indexOf("swap:") === 0) swapSpec["swapDelay"] = parseInterval(modifier.substr(5));
                    if (modifier.indexOf("settle:") === 0) swapSpec["settleDelay"] = parseInterval(modifier.substr(7));
                    if (modifier.indexOf("transition:") === 0) swapSpec["transition"] = modifier.substr(11) === "true";
                    if (modifier.indexOf("scroll:") === 0) {
                        let scrollSpec = modifier.substr(7), splitSpec = scrollSpec.split(":"),
                            scrollVal = splitSpec.pop(), selectorVal = splitSpec.length > 0 ? splitSpec.join(":") : null;
                        swapSpec["scroll"] = scrollVal;
                        swapSpec["scrollTarget"] = selectorVal;
                    }
                    if (modifier.indexOf("show:") === 0) {
                        let showSpec = modifier.substr(5), splitSpec = showSpec.split(":"),
                            showVal = splitSpec.pop(), selectorVal = splitSpec.length > 0 ? splitSpec.join(":") : null;
                        swapSpec["show"] = showVal;
                        swapSpec["showTarget"] = selectorVal;
                    }
                    if (modifier.indexOf("focus-scroll:") === 0) {
                        let focusScrollVal = modifier.substr("focus-scroll:".length);
                        swapSpec["focusScroll"] = focusScrollVal === "true";
                    }
                }
            }
        }
        return swapSpec;
    }
    function usesFormData(elt) {
        return getClosestAttributeValue(elt, "hx-encoding") === "multipart/form-data" ||
            (matches(elt, "form") && getRawAttribute(elt, 'enctype') === "multipart/form-data");
    }
    function encodeParamsForBody(xhr, elt, filteredParameters) {
        let encodedParameters = null;
        withExtensions(elt, function (extension) {
            if (encodedParameters == null) encodedParameters = extension.encodeParameters(xhr, filteredParameters, elt);
        });
        if (encodedParameters != null) return encodedParameters;
        else {
            if (usesFormData(elt)) return makeFormData(filteredParameters);
            return urlEncode(filteredParameters);
        }
    }
    /**
     * @param {Element} target
     * @returns {import("./htmx").HtmxSettleInfo}
     */
    function makeSettleInfo(target) {
        return {tasks: [], elts: [target]};
    }
    function updateScrollState(content, swapSpec) {
        let first = content[0], last = content[content.length - 1];
        if (swapSpec.scroll) {
            let target = null;
            if (swapSpec.scrollTarget) target = querySelectorExt(first, swapSpec.scrollTarget);
            if (swapSpec.scroll === "top" && (first || target)) {
                target = target || first;
                target.scrollTop = 0;
            }
            if (swapSpec.scroll === "bottom" && (last || target)) {
                target = target || last;
                target.scrollTop = target.scrollHeight;
            }
        }
        if (swapSpec.show) {
            let target = null;
            if (swapSpec.showTarget) {
                let targetStr = swapSpec.showTarget;
                if (swapSpec.showTarget === "window") targetStr = "body";
                target = querySelectorExt(first, targetStr);
            }
            if (swapSpec.show === "top" && (first || target)) {
                target = target || first;
                target.scrollIntoView({block:'start', behavior: htmx.config.scrollBehavior});
            }
            if (swapSpec.show === "bottom" && (last || target)) {
                target = target || last;
                target.scrollIntoView({block:'end', behavior: htmx.config.scrollBehavior});
            }
        }
    }
    /**
     * @param {HTMLElement} elt
     * @param {string} attr
     * @param {boolean=} evalAsDefault
     * @param {Object=} values
     * @returns {Object}
     */
    function getValuesForElement(elt, attr, evalAsDefault, values) {
        if (values == null) values = {};
        if (elt == null) return values;
        let attributeValue = getAttributeValue(elt, attr);
        if (attributeValue) {
            let str = attributeValue.trim(), evaluateValue = evalAsDefault;
            if (str === "unset") return null;
            if (str.indexOf("javascript:") === 0) {
                str = str.substr(11);
                evaluateValue = true;
            } else if (str.indexOf("js:") === 0) {
                str = str.substr(3);
                evaluateValue = true;
            }
            if (str.indexOf('{') !== 0) str = "{" + str + "}";
            let varsValues;
            if (evaluateValue) varsValues = maybeEval(elt,function () {return Function("return (" + str + ")")();}, {});
            else varsValues = parseJSON(str);
            for (let key in varsValues) {
                if (varsValues.hasOwnProperty(key)) {
                    if (values[key] == null) values[key] = varsValues[key];
                }
            }
        }
        return getValuesForElement(parentElt(elt), attr, evalAsDefault, values);
    }
    function maybeEval(elt, toEval, defaultVal) {
        if (htmx.config.allowEval) return toEval();
        else {
            triggerErrorEvent(elt, 'htmx:evalDisallowedError');
            return defaultVal;
        }
    }
    /**
     * @param {HTMLElement} elt
     * @param {*} expressionVars
     * @returns
     */
    function getHXVarsForElement(elt, expressionVars) {
        return getValuesForElement(elt, "hx-vars", true, expressionVars);
    }
    /**
     * @param {HTMLElement} elt
     * @param {*} expressionVars
     * @returns
     */
    function getHXValsForElement(elt, expressionVars) {
        return getValuesForElement(elt, "hx-vals", false, expressionVars);
    }
    /**
     * @param {HTMLElement} elt
     * @returns {Object}
     */
    function getExpressionVars(elt) {
        return mergeObjects(getHXVarsForElement(elt), getHXValsForElement(elt));
    }
    function safelySetHeaderValue(xhr, header, headerValue) {
        if (headerValue !== null) {
            try {
                xhr.setRequestHeader(header, headerValue);
            } catch (e) {
                // On an exception, try to set the header URI encoded instead
                xhr.setRequestHeader(header, encodeURIComponent(headerValue));
                xhr.setRequestHeader(header + "-URI-AutoEncoded", "true");
            }
        }
    }
    function getPathFromResponse(xhr) {
        // NB: IE11 does not support this stuff
        if (xhr.responseURL && typeof(URL) !== "undefined") {
            try {
                let url = new URL(xhr.responseURL);
                return url.pathname + url.search;
            } catch (e) {
                triggerErrorEvent(getDocument().body, "htmx:badResponseUrl", {url: xhr.responseURL});
            }
        }
    }
    function hasHeader(xhr, regexp) {
        return xhr.getAllResponseHeaders().match(regexp);
    }
    function ajaxHelper(verb, path, context) {
        verb = verb.toLowerCase();
        if (context) {
            if (context instanceof Element || isType(context, 'String')) return issueAjaxRequest(verb, path, null, null, {targetOverride: resolveTarget(context), returnPromise: true});
            else {
                return issueAjaxRequest(verb, path, resolveTarget(context.source), context.event, {
                    handler : context.handler,
                    headers : context.headers,
                    values : context.values,
                    targetOverride: resolveTarget(context.target),
                    swapOverride: context.swap,
                    returnPromise: true
                });
            }
        }
        return issueAjaxRequest(verb, path, null, null, {returnPromise: true});
    }
    function hierarchyForElt(elt) {
        let arr = [];
        while (elt) {
            arr.push(elt);
            elt = elt.parentElement;
        }
        return arr;
    }
    function issueAjaxRequest(verb, path, elt, event, etc, confirmed) {
        let resolve = null, reject = null;
        etc = etc != null ? etc : {};
        if (etc.returnPromise && typeof Promise !== "undefined"){
            let promise = new Promise(function (_resolve, _reject) {
                resolve = _resolve;
                reject = _reject;
            });
        }
        if (elt == null) elt = getDocument().body;
        let responseHandler = etc.handler || handleAjaxResponse;
        if (!bodyContains(elt)) return; // do not issue requests for elements removed from the DOM
        let target = etc.targetOverride || getTarget(elt);
        if (target == null || target === DUMMY_ELT) {
            triggerErrorEvent(elt, 'htmx:targetError', {target: getAttributeValue(elt, "hx-target")});
            return;
        }
        // allow event-based confirmation w/ a callback
        if (!confirmed) {
            let issueRequest = () => { return issueAjaxRequest(verb, path, elt, event, etc, true); };
            let confirmDetails = {target: target, elt: elt, path: path, verb: verb, triggeringEvent: event, etc: etc, issueRequest: issueRequest};
            if (triggerEvent(elt, 'htmx:confirm', confirmDetails) === false) return;
        }
        let syncElt = elt, eltData = getInternalData(elt), syncStrategy = getClosestAttributeValue(elt, "hx-sync"),
            queueStrategy = null, abortable = false;
        if (syncStrategy) {
            let syncStrings = syncStrategy.split(":"), selector = syncStrings[0].trim();
            if (selector === "this") syncElt = findThisElement(elt, 'hx-sync');
            else syncElt = querySelectorExt(elt, selector);
            // default to the drop strategy
            syncStrategy = (syncStrings[1] || 'drop').trim();
            eltData = getInternalData(syncElt);
            if (syncStrategy === "drop" && eltData.xhr && eltData.abortable !== true) return;
            else if (syncStrategy === "abort") {
                if (eltData.xhr) return;
                else abortable = true;
            } else if (syncStrategy === "replace") triggerEvent(syncElt, 'htmx:abort'); // abort the current request and continue
            else if (syncStrategy.indexOf("queue") === 0) {
                let queueStrArray = syncStrategy.split(" ");
                queueStrategy = (queueStrArray[1] || "last").trim();
            }
        }
        if (eltData.xhr) {
            if (eltData.abortable) triggerEvent(syncElt, 'htmx:abort'); // abort the current request and continue
            else {
                if (queueStrategy == null){
                    if (event) {
                        let eventData = getInternalData(event);
                        if (eventData && eventData.triggerSpec && eventData.triggerSpec.queue) queueStrategy = eventData.triggerSpec.queue;
                    }
                    if (queueStrategy == null) queueStrategy = "last";
                }
                if (eltData.queuedRequests == null) eltData.queuedRequests = [];
                if (queueStrategy === "first" && eltData.queuedRequests.length === 0) eltData.queuedRequests.push(() => { issueAjaxRequest(verb, path, elt, event, etc) });
                else if (queueStrategy === "all") eltData.queuedRequests.push(() => { issueAjaxRequest(verb, path, elt, event, etc) });
                else if (queueStrategy === "last") {
                    eltData.queuedRequests = []; // dump existing queue
                    eltData.queuedRequests.push(() => { issueAjaxRequest(verb, path, elt, event, etc) });
                }
                return;
            }
        }
        let xhr = new XMLHttpRequest();
        eltData.xhr = xhr;
        eltData.abortable = abortable;
        let endRequestLock = function(){
            eltData.xhr = null;
            eltData.abortable = false;
            if (eltData.queuedRequests != null && eltData.queuedRequests.length > 0) {
                let queuedRequest = eltData.queuedRequests.shift();
                queuedRequest();
            }
        }
        let promptQuestion = getClosestAttributeValue(elt, "hx-prompt");
        if (promptQuestion) {
            let promptResponse = prompt(promptQuestion);
            // prompt returns null if cancelled and empty string if accepted with no entry
            if (promptResponse === null || !triggerEvent(elt, 'htmx:prompt', {prompt: promptResponse, target:target})) {
                maybeCall(resolve);
                endRequestLock();
                return promise;
            }
        }
        let confirmQuestion = getClosestAttributeValue(elt, "hx-confirm");
        if (confirmQuestion) {
            if (!confirm(confirmQuestion)) {
                maybeCall(resolve);
                endRequestLock()
                return promise;
            }
        }
        let headers = getHeaders(elt, target, promptResponse);
        if (etc.headers) headers = mergeObjects(headers, etc.headers);
        let results = getInputValues(elt, verb), errors = results.errors, rawParameters = results.values;
        if (etc.values) rawParameters = mergeObjects(rawParameters, etc.values);
        let expressionVars = getExpressionVars(elt), allParameters = mergeObjects(rawParameters, expressionVars),
            filteredParameters = filterValues(allParameters, elt);
        if (verb !== 'get' && !usesFormData(elt)) headers['Content-Type'] = 'application/x-www-form-urlencoded';
        if (htmx.config.getCacheBusterParam && verb === 'get') filteredParameters['org.htmx.cache-buster'] = getRawAttribute(target, "id") || "true";
        // behavior of anchors w/ empty href is to use the current URL
        if (path == null || path === "") path = getDocument().location.href;
        let requestAttrValues = getValuesForElement(elt, 'hx-request'), eltIsBoosted = getInternalData(elt).boosted;
        let requestConfig = {
            boosted: eltIsBoosted,
            parameters: filteredParameters,
            unfilteredParameters: allParameters,
            headers:headers,
            target:target,
            verb:verb,
            errors:errors,
            withCredentials: etc.credentials || requestAttrValues.credentials || htmx.config.withCredentials,
            timeout:  etc.timeout || requestAttrValues.timeout || htmx.config.timeout,
            path:path,
            triggeringEvent:event
        };
        if (!triggerEvent(elt, 'htmx:configRequest', requestConfig)){
            maybeCall(resolve);
            endRequestLock();
            return promise;
        }
        // copy out in case the object was overwritten
        path = requestConfig.path;
        verb = requestConfig.verb;
        headers = requestConfig.headers;
        filteredParameters = requestConfig.parameters;
        errors = requestConfig.errors;
        if (errors && errors.length > 0){
            triggerEvent(elt, 'htmx:validation:halted', requestConfig)
            maybeCall(resolve);
            endRequestLock();
            return promise;
        }
        let splitPath = path.split("#"), pathNoAnchor = splitPath[0], anchor = splitPath[1], finalPathForGet = null;
        if (verb === 'get') {
            finalPathForGet = pathNoAnchor;
            let values = Object.keys(filteredParameters).length !== 0;
            if (values) {
                if (finalPathForGet.indexOf("?") < 0) finalPathForGet += "?";
                else finalPathForGet += "&";
                finalPathForGet += urlEncode(filteredParameters);
                if (anchor) finalPathForGet += "#" + anchor;
            }
            xhr.open('GET', finalPathForGet, true);
        } else xhr.open(verb.toUpperCase(), path, true);
        xhr.overrideMimeType("text/html");
        xhr.withCredentials = requestConfig.withCredentials;
        xhr.timeout = requestConfig.timeout;
        // request headers
        if (requestAttrValues.noHeaders) {// ignore all headers
        } else {
            for (let header in headers) {
                if (headers.hasOwnProperty(header)) {
                    let headerValue = headers[header];
                    safelySetHeaderValue(xhr, header, headerValue);
                }
            }
        }
        let responseInfo = {
            xhr: xhr, target: target, requestConfig: requestConfig, etc: etc, boosted: eltIsBoosted,
            pathInfo: {requestPath: path, finalRequestPath: finalPathForGet || path, anchor: anchor}
        };
        xhr.onload = function () {
            try {
                let hierarchy = hierarchyForElt(elt);
                responseInfo.pathInfo.responsePath = getPathFromResponse(xhr);
                responseHandler(elt, responseInfo);
                removeRequestIndicatorClasses(indicators);
                triggerEvent(elt, 'htmx:afterRequest', responseInfo);
                triggerEvent(elt, 'htmx:afterOnLoad', responseInfo);
                // if the body no longer contains the element, trigger the event on the closest parent remaining in the DOM
                if (!bodyContains(elt)) {
                    let secondaryTriggerElt = null;
                    while (hierarchy.length > 0 && secondaryTriggerElt == null) {
                        let parentEltInHierarchy = hierarchy.shift();
                        if (bodyContains(parentEltInHierarchy)) secondaryTriggerElt = parentEltInHierarchy;
                    }
                    if (secondaryTriggerElt) {
                        triggerEvent(secondaryTriggerElt, 'htmx:afterRequest', responseInfo);
                        triggerEvent(secondaryTriggerElt, 'htmx:afterOnLoad', responseInfo);
                    }
                }
                maybeCall(resolve);
                endRequestLock();
            } catch (e) {
                triggerErrorEvent(elt, 'htmx:onLoadError', mergeObjects({error:e}, responseInfo));
                throw e;
            }
        }
        xhr.onerror = function () {
            removeRequestIndicatorClasses(indicators);
            triggerErrorEvent(elt, 'htmx:afterRequest', responseInfo);
            triggerErrorEvent(elt, 'htmx:sendError', responseInfo);
            maybeCall(reject);
            endRequestLock();
        }
        xhr.onabort = function() {
            removeRequestIndicatorClasses(indicators);
            triggerErrorEvent(elt, 'htmx:afterRequest', responseInfo);
            triggerErrorEvent(elt, 'htmx:sendAbort', responseInfo);
            maybeCall(reject);
            endRequestLock();
        }
        xhr.ontimeout = function() {
            removeRequestIndicatorClasses(indicators);
            triggerErrorEvent(elt, 'htmx:afterRequest', responseInfo);
            triggerErrorEvent(elt, 'htmx:timeout', responseInfo);
            maybeCall(reject);
            endRequestLock();
        }
        if(!triggerEvent(elt, 'htmx:beforeRequest', responseInfo)){
            maybeCall(resolve);
            endRequestLock()
            return promise
        }
        let indicators = addRequestIndicatorClasses(elt);
        forEach(['loadstart', 'loadend', 'progress', 'abort'], function(eventName) {
            forEach([xhr, xhr.upload], function (target) {
                target.addEventListener(eventName, function(event){
                    triggerEvent(elt, "htmx:xhr:" + eventName, {lengthComputable:event.lengthComputable, loaded:event.loaded, total:event.total});
                })
            });
        });
        triggerEvent(elt, 'htmx:beforeSend', responseInfo);
        xhr.send(verb === 'get' ? null : encodeParamsForBody(xhr, elt, filteredParameters));
        return promise;
    }
    function determineHistoryUpdates(elt, responseInfo) {
        let xhr = responseInfo.xhr;
        //===========================================
        // First consult response headers
        //===========================================
        let pathFromHeaders = null, typeFromHeaders = null;
        if (hasHeader(xhr,/HX-Push:/i)) {
            pathFromHeaders = xhr.getResponseHeader("HX-Push");
            typeFromHeaders = "push";
        } else if (hasHeader(xhr,/HX-Push-Url:/i)) {
            pathFromHeaders = xhr.getResponseHeader("HX-Push-Url");
            typeFromHeaders = "push";
        } else if (hasHeader(xhr,/HX-Replace-Url:/i)) {
            pathFromHeaders = xhr.getResponseHeader("HX-Replace-Url");
            typeFromHeaders = "replace";
        }
        // if there was a response header, that has priority
        if (pathFromHeaders) {
            if (pathFromHeaders === "false") return {}
            return {type: typeFromHeaders, path : pathFromHeaders}
        }
        //===========================================
        // Next resolve via DOM values
        //===========================================
        let requestPath =  responseInfo.pathInfo.finalRequestPath, responsePath =  responseInfo.pathInfo.responsePath,
            pushUrl = getClosestAttributeValue(elt, "hx-push-url"),
            replaceUrl = getClosestAttributeValue(elt, "hx-replace-url"),
            elementIsBoosted = getInternalData(elt).boosted, saveType = null, path = null;
        if (pushUrl) {
            saveType = "push";
            path = pushUrl;
        } else if (replaceUrl) {
            saveType = "replace";
            path = replaceUrl;
        } else if (elementIsBoosted) {
            saveType = "push";
            path = responsePath || requestPath; // if there is no response path, go with the original request path
        }
        if (path) {
            // false indicates no push, return empty object
            if (path === "false") return {};
            // true indicates we want to follow wherever the server ended up sending us
            if (path === "true") path = responsePath || requestPath; // if there is no response path, go with the original request path
            // restore any anchor associated with the request
            if (responseInfo.pathInfo.anchor && path.indexOf("#") === -1) path = path + "#" + responseInfo.pathInfo.anchor;
            return {type:saveType, path: path}
        }
        return {};
    }
    function handleAjaxResponse(elt, responseInfo) {
        let xhr = responseInfo.xhr, target = responseInfo.target, etc = responseInfo.etc;
        if (!triggerEvent(elt, 'htmx:beforeOnLoad', responseInfo)) return;
        if (hasHeader(xhr, /HX-Trigger:/i)) handleTrigger(xhr, "HX-Trigger", elt);
        if (hasHeader(xhr, /HX-Location:/i)) {
            saveCurrentPageToHistory();
            let redirectPath = xhr.getResponseHeader("HX-Location"), swapSpec;
            if (redirectPath.indexOf("{") === 0) {
                swapSpec = parseJSON(redirectPath);
                // what's the best way to throw an error if the user didn't include this
                redirectPath = swapSpec['path'];
                delete swapSpec['path'];
            }
            ajaxHelper('GET', redirectPath, swapSpec).then(() => { pushUrlIntoHistory(redirectPath); });
            return;
        }
        if (hasHeader(xhr, /HX-Redirect:/i)) {
            location.href = xhr.getResponseHeader("HX-Redirect");
            return;
        }
        if (hasHeader(xhr,/HX-Refresh:/i)) {
            if ("true" === xhr.getResponseHeader("HX-Refresh")) {
                location.reload();
                return;
            }
        }
        if (hasHeader(xhr,/HX-Retarget:/i)) responseInfo.target = getDocument().querySelector(xhr.getResponseHeader("HX-Retarget"));
        let historyUpdate = determineHistoryUpdates(elt, responseInfo);
        // by default htmx only swaps on 200 return codes and does not swap on 204 'No Content'
        // this can be ovverriden by responding to the htmx:beforeSwap event and overriding the detail.shouldSwap property
        let shouldSwap = xhr.status >= 200 && xhr.status < 400 && xhr.status !== 204, serverResponse = xhr.response,
            isError = xhr.status >= 400, beforeSwapDetails = mergeObjects({shouldSwap: shouldSwap, serverResponse:serverResponse, isError:isError}, responseInfo);
        if (!triggerEvent(target, 'htmx:beforeSwap', beforeSwapDetails)) return;
        target = beforeSwapDetails.target; // allow re-targeting
        serverResponse = beforeSwapDetails.serverResponse; // allow updating content
        isError = beforeSwapDetails.isError; // allow updating error
        responseInfo.target = target; // Make updated target available to response events
        responseInfo.failed = isError; // Make failed property available to response events
        responseInfo.successful = !isError; // Make successful property available to response events
        if (beforeSwapDetails.shouldSwap) {
            if (xhr.status === 286) cancelPolling(elt);
            withExtensions(elt, function (extension) {
                serverResponse = extension.transformResponse(serverResponse, xhr, elt);
            });
            // Save current page if there will be a history update
            if (historyUpdate.type) saveCurrentPageToHistory();
            let swapOverride = etc.swapOverride;
            if (hasHeader(xhr,/HX-Reswap:/i)) swapOverride = xhr.getResponseHeader("HX-Reswap");
            let swapSpec = getSwapSpecification(elt, swapOverride);
            target.classList.add(htmx.config.swappingClass);
            // optional transition API promise callbacks
            let settleResolve = null, settleReject = null;
            let doSwap = function () {
                try {
                    let activeElt = document.activeElement, selectionInfo = {};
                    try {
                        // @ts-ignore
                        selectionInfo = {elt: activeElt, start: activeElt ? activeElt.selectionStart : null, end: activeElt ? activeElt.selectionEnd : null};
                    } catch (e) {
                        // safari issue - see https://github.com/microsoft/playwright/issues/5894
                    }
                    let settleInfo = makeSettleInfo(target);
                    selectAndSwap(swapSpec.swapStyle, target, elt, serverResponse, settleInfo);
                    if (selectionInfo.elt && !bodyContains(selectionInfo.elt) && selectionInfo.elt.id) {
                        let newActiveElt = document.getElementById(selectionInfo.elt.id);
                        let focusOptions = { preventScroll: swapSpec.focusScroll !== undefined ? !swapSpec.focusScroll : !htmx.config.defaultFocusScroll };
                        if (newActiveElt) {
                            // @ts-ignore
                            if (selectionInfo.start && newActiveElt.setSelectionRange) {
                                // @ts-ignore
                                try {
                                    newActiveElt.setSelectionRange(selectionInfo.start, selectionInfo.end);
                                } catch (e) {
                                    // the setSelectionRange method is present on fields that don't support it, so just let this fail
                                }
                            }
                            newActiveElt.focus(focusOptions);
                        }
                    }
                    target.classList.remove(htmx.config.swappingClass);
                    forEach(settleInfo.elts, function (elt) {
                        if (elt.classList) elt.classList.add(htmx.config.settlingClass);
                        triggerEvent(elt, 'htmx:afterSwap', responseInfo);
                    });
                    if (hasHeader(xhr, /HX-Trigger-After-Swap:/i)) {
                        let finalElt = elt;
                        if (!bodyContains(elt)) finalElt = getDocument().body;
                        handleTrigger(xhr, "HX-Trigger-After-Swap", finalElt);
                    }
                    let doSettle = function () {
                        forEach(settleInfo.tasks, (task) => { task.call(); });
                        forEach(settleInfo.elts, function (elt) {
                            if (elt.classList) elt.classList.remove(htmx.config.settlingClass);
                            triggerEvent(elt, 'htmx:afterSettle', responseInfo);
                        });
                        // if we need to save history, do so
                        if (historyUpdate.type) {
                            if (historyUpdate.type === "push") {
                                pushUrlIntoHistory(historyUpdate.path);
                                triggerEvent(getDocument().body, 'htmx:pushedIntoHistory', {path: historyUpdate.path});
                            } else {
                                replaceUrlInHistory(historyUpdate.path);
                                triggerEvent(getDocument().body, 'htmx:replacedInHistory', {path: historyUpdate.path});
                            }
                        }
                        if (responseInfo.pathInfo.anchor) {
                            let anchorTarget = find("#" + responseInfo.pathInfo.anchor);
                            if (anchorTarget) anchorTarget.scrollIntoView({block:'start', behavior: "auto"});
                        }
                        if (settleInfo.title) {
                            let titleElt = find("title");
                            if (titleElt) titleElt.innerHTML = settleInfo.title;
                            else window.document.title = settleInfo.title;
                        }
                        updateScrollState(settleInfo.elts, swapSpec);
                        if (hasHeader(xhr, /HX-Trigger-After-Settle:/i)) {
                            let finalElt = elt;
                            if (!bodyContains(elt)) finalElt = getDocument().body;
                            handleTrigger(xhr, "HX-Trigger-After-Settle", finalElt);
                        }
                        maybeCall(settleResolve);
                    }
                    if (swapSpec.settleDelay > 0) setTimeout(doSettle, swapSpec.settleDelay)
                    else doSettle();
                } catch (e) {
                    triggerErrorEvent(elt, 'htmx:swapError', responseInfo);
                    maybeCall(settleReject);
                    throw e;
                }
            };
            let shouldTransition = htmx.config.globalViewTransitions
            if (swapSpec.hasOwnProperty('transition')) shouldTransition = swapSpec.transition;
            if (shouldTransition && triggerEvent(elt, 'htmx:beforeTransition', responseInfo) && typeof Promise !== "undefined" && document.startViewTransition){
                let settlePromise = new Promise(function (_resolve, _reject) {
                    settleResolve = _resolve;
                    settleReject = _reject;
                });
                // wrap the original doSwap() in a call to startViewTransition()
                let innerDoSwap = doSwap;
                doSwap = function() {
                    document.startViewTransition(function () {
                        innerDoSwap();
                        return settlePromise;
                    });
                }
            }
            if (swapSpec.swapDelay > 0) setTimeout(doSwap, swapSpec.swapDelay)
            else doSwap();
        }
        if (isError) triggerErrorEvent(elt, 'htmx:responseError', mergeObjects({error: "Response Status Error Code " + xhr.status + " from " + responseInfo.pathInfo.requestPath}, responseInfo));
    }
    //====================================================================
    // Extensions API
    //====================================================================
    /** @type {Object<string, import("./htmx").HtmxExtension>} */
    let extensions = {};
    /**
     * extensionBase defines the default functions for all extensions.
     * @returns {import("./htmx").HtmxExtension}
     */
    function extensionBase() {
        return {
            init: function(api) {return null;},
            onEvent : function(name, evt) {return true;},
            transformResponse : function(text, xhr, elt) {return text;},
            isInlineSwap : function(swapStyle) {return false;},
            handleSwap : function(swapStyle, target, fragment, settleInfo) {return false;},
            encodeParameters : function(xhr, parameters, elt) {return null;}
        }
    }
    /**
     * defineExtension initializes the extension and adds it to the htmx registry
     *
     * @param {string} name
     * @param {import("./htmx").HtmxExtension} extension
     */
    function defineExtension(name, extension) {
        if (extension.init) extension.init(internalAPI)
        extensions[name] = mergeObjects(extensionBase(), extension);
    }
    /**
     * removeExtension removes an extension from the htmx registry
     *
     * @param {string} name
     */
    function removeExtension(name) {
        delete extensions[name];
    }
    /**
     * getExtensions searches up the DOM tree to return all extensions that can be applied to a given element
     *
     * @param {HTMLElement} elt
     * @param {import("./htmx").HtmxExtension[]=} extensionsToReturn
     * @param {import("./htmx").HtmxExtension[]=} extensionsToIgnore
     */
    function getExtensions(elt, extensionsToReturn, extensionsToIgnore) {
        if (elt === undefined) return extensionsToReturn;
        if (extensionsToReturn === undefined) extensionsToReturn = [];
        if (extensionsToIgnore === undefined) extensionsToIgnore = [];
        let extensionsForElement = getAttributeValue(elt, "hx-ext");
        if (extensionsForElement) {
            forEach(extensionsForElement.split(","), function(extensionName){
                extensionName = extensionName.replace(/ /g, '');
                if (extensionName.slice(0, 7) === "ignore:") {
                    extensionsToIgnore.push(extensionName.slice(7));
                    return;
                }
                if (extensionsToIgnore.indexOf(extensionName) < 0) {
                    let extension = extensions[extensionName];
                    if (extension && extensionsToReturn.indexOf(extension) < 0) extensionsToReturn.push(extension);
                }
            });
        }
        return getExtensions(parentElt(elt), extensionsToReturn, extensionsToIgnore);
    }
    //====================================================================
    // Initialization
    //====================================================================
    function ready(fn) {
        if (getDocument().readyState !== 'loading') fn();
        else getDocument().addEventListener('DOMContentLoaded', fn);
    }
    function insertIndicatorStyles() {
        if (htmx.config.includeIndicatorStyles !== false) {
            getDocument().head.insertAdjacentHTML("beforeend", "<style>\
                ." + htmx.config.indicatorClass + "{opacity:0;transition: opacity 200ms ease-in;}\
                ." + htmx.config.requestClass + " ." + htmx.config.indicatorClass + "{opacity:1}\
                ." + htmx.config.requestClass + "." + htmx.config.indicatorClass + "{opacity:1}\
            </style>");
        }
    }
    function getMetaConfig() {
        let element = getDocument().querySelector('meta[name="htmx-config"]');
        // @ts-ignore
        if (element) return parseJSON(element.content);
        return null;
    }
    function mergeMetaConfig() {
        let metaConfig = getMetaConfig();
        if (metaConfig) htmx.config = mergeObjects(htmx.config , metaConfig)
    }
    // initialize the document
    ready(function () {
        mergeMetaConfig();
        insertIndicatorStyles();
        let body = getDocument().body;
        processNode(body);
        let restoredElts = getDocument().querySelectorAll("[hx-trigger='restored'],[data-hx-trigger='restored']");
        body.addEventListener("htmx:abort", function (evt) {
            let target = evt.target, internalData = getInternalData(target);
            if (internalData && internalData.xhr) internalData.xhr.abort();
        });
        window.onpopstate = function (event) {
            if (event.state && event.state.htmx) {
                restoreHistory();
                forEach(restoredElts, function(elt){
                    triggerEvent(elt, 'htmx:restored', {'document': getDocument(), 'triggerEvent': triggerEvent});
                });
            }
        };
        setTimeout(function () {
            triggerEvent(body, 'htmx:load', {}); // give ready handlers a chance to load up before firing this event
            body = null; // kill reference for gc
        }, 0);
    })
    return htmx;
})()}));