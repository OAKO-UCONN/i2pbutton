// ### Shortcut
const { Cu: utils, Cr: results } = Components

// ### Import Mozilla Services
Cu.import("resource://gre/modules/Services.jsm")
Cu.import("resource://gre/modules/FileUtils.jsm")

// ### Import global URL
Cu.importGlobalProperties(["URL"])

const ioService = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService)

/**
 *
 *
var pps = Components.classes["@mozilla.org/network/protocol-proxy-service;1"]
          .getService(Components.interfaces.nsIProtocolProxyService);

// Create the proxy info object in advance to avoid creating one every time
var myProxyInfo = pps.newProxyInfo("http", "127.0.0.1", 8080, 0, -1, 0);

var filter = {
  applyFilter: function(pps, uri, proxy)
  {
    if (uri.spec == ...)
      return myProxyInfo;
    else
      return proxy;
  }
};
pps.registerFilter(filter, 1000);
 */

const getProfileDir = function() {
  let directoryService =
    Cc["@mozilla.org/file/directory_service;1"].
      getService(Ci.nsIProperties)
  // this is a reference to the profile dir (ProfD) now.
  let localDir = directoryService.get("ProfD", Ci.nsIFile)
  return localDir.path
}

//window.open("chrome://browser/content/browser.xul", "bmarks", "chrome,width=600,height=300")

// __prefs__. A shortcut to Mozilla Services.prefs.
let prefs = Services.prefs;

// __getPrefValue(prefName)__
// Returns the current value of a preference, regardless of its type.
var getPrefValue = function (prefName) {
  switch(prefs.getPrefType(prefName)) {
    case prefs.PREF_BOOL: return prefs.getBoolPref(prefName);
    case prefs.PREF_INT: return prefs.getIntPref(prefName);
    case prefs.PREF_STRING: return prefs.getCharPref(prefName);
    default: return null;
  }
};

// __bindPref(prefName, prefHandler, init)__
// Applies prefHandler whenever the value of the pref changes.
// If init is true, applies prefHandler to the current value.
// Returns a zero-arg function that unbinds the pref.
var bindPref = function (prefName, prefHandler, init = false) {
  let update = () => { prefHandler(getPrefValue(prefName)); },
      observer = { observe : function (subject, topic, data) {
                     if (data === prefName) {
                         update();
                     }
                   } };
  prefs.addObserver(prefName, observer, false);
  if (init) {
    update();
  }
  return () => { prefs.removeObserver(prefName, observer); };
};

// __bindPrefAndInit(prefName, prefHandler)__
// Applies prefHandler to the current value of pref specified by prefName.
// Re-applies prefHandler whenever the value of the pref changes.
// Returns a zero-arg function that unbinds the pref.
var bindPrefAndInit = (prefName, prefHandler) =>
    bindPref(prefName, prefHandler, true);

// ## Observers

// __observe(topic, callback)__.
// Observe the given topic. When notification of that topic
// occurs, calls callback(subject, data). Returns a zero-arg
// function that stops observing.
var observe = function (topic, callback) {
  let observer = {
    observe: function (aSubject, aTopic, aData) {
      if (topic === aTopic) {
        callback(aSubject, aData);
      }
    },
  };
  Services.obs.addObserver(observer, topic, false);
  return () => Services.obs.removeObserver(observer, topic);
};

// ## Environment variables

// __env__.
// Provides access to process environment variables.
let env = Components.classes["@mozilla.org/process/environment;1"]
            .getService(Components.interfaces.nsIEnvironment);

// __getEnv(name)__.
// Reads the environment variable of the given name.
var getEnv = function (name) {
  return env.exists(name) ? env.get(name) : undefined;
};

// __getLocale
// Reads the browser locale, the default locale is en-US.
var getLocale = function() {
  return Services.locale.getRequestedLocale() || "en-US";
}

// ## Windows

// __dialogsByName__.
// Map of window names to dialogs.
let dialogsByName = {};

// __showDialog(parent, url, name, features, arg1, arg2, ...)__.
// Like window.openDialog, but if the window is already
// open, just focuses it instead of opening a new one.
var showDialog = function (parent, url, name, features) {
  let existingDialog = dialogsByName[name];
  if (existingDialog && !existingDialog.closed) {
    existingDialog.focus();
    return existingDialog;
  } else {
    let newDialog = parent.openDialog.apply(parent,
                                            Array.slice(arguments, 1));
    dialogsByName[name] = newDialog;
    return newDialog;
  }
}

var openTabWithFocus = function (url) {
  gBrowser.selectedTab = gBrowser.addTab(url)
}
