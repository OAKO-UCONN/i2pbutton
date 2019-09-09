// vim: set sw=2 sts=2 ts=8 et syntax=javascript:

const Cc = Components.classes
const Ci = Components.interfaces
const Cr = Components.results
const Cu = Components.utils

/*const ZipReader = Components.Constructor(
  "@mozilla.org/libjar/zip-reader;1",
  "nsIZipReader",
  "open"
)*/
const nsFile = Components.Constructor(
  "@mozilla.org/file/local;1",
  "nsIFile",
  "initWithPath"
)
Cu.import("resource://gre/modules/XPCOMUtils.jsm")
Cu.import("resource://gre/modules/Services.jsm")
Cu.import('resource://gre/modules/osfile.jsm')
Cu.import('resource://gre/modules/FileUtils.jsm')

XPCOMUtils.defineLazyModuleGetter(this, "LauncherUtil", "resource://i2pbutton/modules/launcher-util.jsm")

let consolePort = Services.prefs.getIntPref("extensions.i2pbutton.console_port_i2pj", 17657)
let httpProxyPort = Services.prefs.getIntPref("network.proxy.http_port", 14444)

const defaultProxyTunnels = `# Autogenerated by I2P Browser
tunnel.0.description=HTTP proxy for browsing eepsites and the web
tunnel.0.interface=127.0.0.1
tunnel.0.listenPort=${httpProxyPort}
tunnel.0.name=I2P HTTP Proxy
tunnel.0.option.i2cp.closeIdleTime=1800000
tunnel.0.option.i2cp.closeOnIdle=false
tunnel.0.option.i2cp.delayOpen=false
tunnel.0.option.i2cp.destination.sigType=7
tunnel.0.option.i2cp.newDestOnResume=false
tunnel.0.option.i2cp.reduceIdleTime=900000
tunnel.0.option.i2cp.reduceOnIdle=true
tunnel.0.option.i2cp.reduceQuantity=1
tunnel.0.option.i2p.streaming.connectDelay=0
tunnel.0.option.i2ptunnel.httpclient.SSLOutproxies=false.i2p
tunnel.0.option.i2ptunnel.httpclient.allowInternalSSL=true
tunnel.0.option.i2ptunnel.httpclient.jumpServers=http://stats.i2p/cgi-bin/jump.cgi?a=,http://i2pjump.i2p/jump/
tunnel.0.option.i2ptunnel.httpclient.sendAccept=false
tunnel.0.option.i2ptunnel.httpclient.sendReferer=false
tunnel.0.option.i2ptunnel.httpclient.sendUserAgent=false
tunnel.0.option.i2ptunnel.useLocalOutproxy=false
tunnel.0.option.inbound.backupQuantity=0
tunnel.0.option.inbound.length=3
tunnel.0.option.inbound.lengthVariance=0
tunnel.0.option.inbound.nickname=shared clients
tunnel.0.option.inbound.quantity=6
tunnel.0.option.outbound.backupQuantity=0
tunnel.0.option.outbound.length=3
tunnel.0.option.outbound.lengthVariance=0
tunnel.0.option.outbound.nickname=shared clients
tunnel.0.option.outbound.priority=10
tunnel.0.option.outbound.quantity=6
tunnel.0.option.outproxyAuth=false
tunnel.0.option.persistentClientKey=false
tunnel.0.option.sslManuallySet=true
tunnel.0.option.useSSL=false
tunnel.0.proxyList=false.i2p
tunnel.0.sharedClient=true
tunnel.0.startOnLoad=true
tunnel.0.type=httpclient
`

const defaultClientsConfig = `# Autogenerated by I2P Browser
clientApp.0.args=${consolePort} ::1,127.0.0.1 ./webapps/
clientApp.0.main=net.i2p.router.web.RouterConsoleRunner
clientApp.0.name=I2P Router Console
clientApp.0.onBoot=true
clientApp.0.startOnLoad=true
clientApp.1.main=net.i2p.i2ptunnel.TunnelControllerGroup
clientApp.1.name=Application tunnels
clientApp.1.args=i2ptunnel.config
clientApp.1.delay=-1
clientApp.1.startOnLoad=true
`

const defaultSocksProxyTunnels = `# Autogenerated by I2P Browser
tunnel.1.interface=127.0.0.1
tunnel.1.listenPort=4455
tunnel.1.name=SOCKS
tunnel.1.option.i2cp.closeIdleTime=1800000
tunnel.1.option.i2cp.closeOnIdle=false
tunnel.1.option.i2cp.delayOpen=false
tunnel.1.option.i2cp.destination.sigType=7
tunnel.1.option.i2cp.newDestOnResume=false
tunnel.1.option.i2cp.reduceIdleTime=1200000
tunnel.1.option.i2cp.reduceOnIdle=false
tunnel.1.option.i2cp.reduceQuantity=1
tunnel.1.option.i2p.streaming.connectDelay=0
tunnel.1.option.i2ptunnel.httpclient.allowInternalSSL=false
tunnel.1.option.i2ptunnel.httpclient.sendAccept=false
tunnel.1.option.i2ptunnel.httpclient.sendReferer=false
tunnel.1.option.i2ptunnel.httpclient.sendUserAgent=false
tunnel.1.option.i2ptunnel.useLocalOutproxy=true
tunnel.1.option.inbound.backupQuantity=0
tunnel.1.option.inbound.length=3
tunnel.1.option.inbound.lengthVariance=0
tunnel.1.option.inbound.nickname=SOCKS
tunnel.1.option.inbound.quantity=3
tunnel.1.option.outbound.backupQuantity=0
tunnel.1.option.outbound.length=3
tunnel.1.option.outbound.lengthVariance=0
tunnel.1.option.outbound.nickname=SOCKS
tunnel.1.option.outbound.quantity=3
tunnel.1.option.outproxyAuth=false
tunnel.1.option.persistentClientKey=false
tunnel.1.option.useSSL=false
tunnel.1.proxyList=exitpoint.i2p
tunnel.1.sharedClient=false
tunnel.1.startOnLoad=false
tunnel.1.type=sockstunnel
`

const defaultRouterConfig = `# Autogenerated by I2P Browser
i2np.laptopMode=true
i2np.upnp.enable=true
i2np.udp.addressSources=local,upnp,ssu
i2p.reseedURL=https://download.xxlspeed.com/,https://i2p.mooo.com/netDb/,https://i2p.novg.net/,https://i2pseed.creativecowpat.net:8443/,https://itoopie.atomike.ninja/,https://netdb.i2p2.no/,https://reseed.i2p-projekt.de/,https://reseed.i2p.net.in/,https://reseed.memcpy.io/,https://reseed.onion.im/
router.outboundPool.quantity=7
router.inboundPool.quantity=7
router.sharePercentage=50
`


function RouterConfigManager() {
  this.version = '0.1'
  this._logger = Cc["@geti2p.net/i2pbutton-logger;1"].getService(Ci.nsISupports).wrappedJSObject
  this._logger.log(3, "I2pbutton I2P RouterConfigManager Service initialized")
  this.wrappedJSObject = this
}

RouterConfigManager.prototype = {
  // properties required for XPCOM registration:
  classDescription: "A component for handling the embedded router config",
  classID:          Components.ID("{E2AA62BB-AFD0-4D94-9408-90CE39784086}"),
  contractID:       "@geti2p.net/i2pbutton-router-config-mgr;1",
  serviceName:      'RouterConfigManager',
  wrappedJSObject:  null,
  _logger:          null,
  state:            {},

  // State
  mDoesRouterConfigExists: false,
  mDoesClientsConfigExists: false,
  mDoesTunnelConfigExists: false,
  mHasChecksStarted: false,
  mIsChecksDone: false,


  // nsISupports implementation.
  QueryInterface: XPCOMUtils.generateQI([Components.interfaces.nsISupports]),

  canRouterStart: function() {
    return (this.mDoesRouterConfigExists && this.mDoesClientsConfigExists && this.mDoesTunnelConfigExists)
  },


  _write_router_config: function(configfile,onComplete) {
    const self = this
    LauncherUtil.writeFileWithData(configfile, defaultRouterConfig, file => { onComplete(file) }, (err) => {
      this._logger.log(6,`Can't write router config file :( - path was ${configfile.path}`)
    })
  },
  _write_tunnel_config: function(configfile,onComplete) {
    const self = this
    LauncherUtil.writeFileWithData(configfile, defaultProxyTunnels, file => { onComplete(file) }, (err) => {
      this._logger.log(6,`Can't write tunnel proxy config file :( - path was ${configfile.path}`)
    })
  },
  _write_clients_config: function(configfile,onComplete) {
    const self = this
    LauncherUtil.writeFileWithData(configfile, defaultClientsConfig, file => { onComplete(file) }, (err) => {
      this._logger.log(6,`Can't write clients config file :( - path was ${configfile.path}`)
    })
  },

  copy_recursive: async function(sourceDir, destDir) {
    let items = sourceDir.directoryEntries
    while (items.hasMoreElements()) {
      let item = items.getNext().QueryInterface(Components.interfaces.nsIFile)
      if (item.isFile()) {
        item.copyTo(destDir, "")
        this._logger.log(3, `Copied ${item.path}`)
      } else if (item.isDirectory()) {
        let newDir = destDir.clone()
        newDir.append(item.leafName)
        newDir.create(newDir.DIRECTORY_TYPE, 0o775)
        this._logger.log(3, `Recursively copying ${item.path}`)
        this.copy_recursive(item, newDir)
      }
    }
  },

  ensure_docs: async function() {
    let configDirectory = LauncherUtil.getI2PConfigPath(true)
    let destDocsDir = configDirectory.clone()
    let distDocsDir = LauncherUtil.getI2PBinary()
    distDocsDir = distDocsDir.parent.parent
    distDocsDir.append('docs')
    destDocsDir.append('docs')
    if (!destDocsDir.exists()) {
      this.copy_recursive(distDocsDir, destDocsDir)
    }
  },

  ensure_webapps: async function() {
    let configDirectory = LauncherUtil.getI2PConfigPath(true)
    let destWebappDir = configDirectory.clone()
    let distWebppDir = LauncherUtil.getI2PBinary()
    distWebppDir = distWebppDir.parent.parent
    distWebppDir.append('webapps')
    destWebappDir.append('webapps')
    if (!destWebappDir.exists()) {
      destWebappDir.create(destWebappDir.DIRECTORY_TYPE, 0o775)
      let items = distWebppDir.directoryEntries
      while (items.hasMoreElements()) {
        let item = items.getNext().QueryInterface(Components.interfaces.nsIFile)
        if (item.isFile()) {
          item.copyTo(destWebappDir, "")
          this._logger.log(3, `Copied ${item.path}`)
        }
      }
    }
  },


  ensure_config: async function(onCompleteCallback) {
    this.mHasChecksStarted = true

    let configDirectory = LauncherUtil.getI2PConfigPath(true)
    let routerConfigFile = configDirectory.clone()
    routerConfigFile.append('router.config')
    let tunnelConfigFile = configDirectory.clone()
    tunnelConfigFile.append('i2ptunnel.config')
    let clientsConfigFile = configDirectory.clone()
    clientsConfigFile.append('clients.config')

    let hoststxtFile = configDirectory.clone()
    hoststxtFile.append('hosts.txt')

    if (!hoststxtFile.exists()) {
      let distFile = LauncherUtil.getI2PBinary().parent.parent
      distFile.append('hosts.txt')
      distFile.copyTo(hoststxtFile.parent, "")
      this._logger.log(3, `Copied hosts.txt file`)
    }

    // Temporary jetty fix
    let orgDir = configDirectory.clone()
    orgDir.append('org')
    if (!orgDir.exists()) {
      orgDir.create(orgDir.DIRECTORY_TYPE, 0o775)
      orgDir.append('eclipse')
      orgDir.create(orgDir.DIRECTORY_TYPE, 0o775)
      orgDir.append('jetty')
      orgDir.create(orgDir.DIRECTORY_TYPE, 0o775)
      orgDir.append('webapp')
      orgDir.create(orgDir.DIRECTORY_TYPE, 0o775)
      let distJettyFile = LauncherUtil.getI2PBinary().parent.parent
      distJettyFile.append('org')
      distJettyFile.append('eclipse')
      distJettyFile.append('jetty')
      distJettyFile.append('webapp')
      distJettyFile.append('webdefault.xml')
      distJettyFile.copyTo(orgDir, '')
    }

    this.ensure_docs()
    this.ensure_webapps()

    // Ensure they exists
    const self = this

    this.ensureRouterConfigPromise = () => {
      return new Promise(resolve => {
        if (!routerConfigFile.exists()) {
          self._write_router_config(routerConfigFile, file => {
            self.mDoesRouterConfigExists = true
            self._logger.log(3, 'Wrote router.config')
            if (typeof onCompleteCallback === 'function') onCompleteCallback(file)
            resolve(routerConfigFile)
          })
        } else {
          self._logger.log(3, 'Found router.config from earlier')
          self.mDoesRouterConfigExists = true
          resolve(null)
        }
      })
    }

    this.ensureTunnelConfigPromise = () => {
      return new Promise(resolve => {
        if (!tunnelConfigFile.exists()) {
          self._write_tunnel_config(tunnelConfigFile, tfile => {
            self._logger.log(3, 'Wrote i2ptunnel.config')
            self.mDoesTunnelConfigExists = true
            if (typeof onCompleteCallback === 'function') onCompleteCallback(tfile)
            resolve(tunnelConfigFile)
          })
        } else {
          self._logger.log(3, 'Found i2ptunnel.config from earlier')
          self.mDoesTunnelConfigExists = true
          resolve(null)
        }
      })
    }

    this.ensureClientsConfigPromise = () => {
      return new Promise(resolve => {
        if (!clientsConfigFile.exists()) {
          self._write_clients_config(clientsConfigFile, tfile => {
            self._logger.log(3, 'Wrote clients.config')
            self.mDoesClientsConfigExists = true
            if (typeof onCompleteCallback === 'function') onCompleteCallback(tfile)
            resolve(clientsConfigFile)
          })
        } else {
          self._logger.log(3, 'Found clients.config from earlier')
          self.mDoesClientsConfigExists = true
          resolve(null)
        }
      })
    }

    // Promises are not done but at least done here.
    this.mIsChecksDone = true
    return Promise.all([
      this.ensureRouterConfigPromise(),
      this.ensureTunnelConfigPromise(),
      this.ensureClientsConfigPromise(),
    ])
  },
}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([RouterConfigManager])
