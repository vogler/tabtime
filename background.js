function a (f) { // transform function with callback to async function
  return async function () {
    return new Promise(r => f.apply(this, Array.prototype.slice.call(arguments).concat(r)));
  }
}

chrome.storage.onChanged.addListener(function (changes, namespace) {
  for (let key in changes) {
    let x = changes[key];
    // console.log('Storage key', key, 'in namespace', namespace, 'changed from', x.oldValue, 'to', x.newValue);
    // TODO apparently there's no way to find out the current device name
    // https://developer.chrome.com/extensions/signedInDevices
    let close = x.newValue;
    console.log(thisDevice);
    for (device in close) {
      console.log(device, close);
      if (device == thisDevice && close[device].length) {
        console.log("should close on this device");
        chrome.tabs.query({ "url": close[device] }, function (tabs) {
          console.log("should close the tabs", tabs);
          chrome.tabs.remove(tabs.map(x => x.id));
        });
        close[device] = [];
        chrome.storage.sync.set({ "close": close });
        break;
      }
    }
  }
});

var current = null;
var time = {};
function saveTime(){
  if(current){
    time[current.url] = (time[current.url] || 0) + Date.now() - current.last;
  }
}
function resume(url){
  saveTime();
  current = { "url": url || current && current.url, "last": Date.now() };
}
function pause(){
  saveTime();
  current = null;
}

chrome.tabs.onUpdated.addListener(function (tabId, changedInfo, tab){
  if(changedInfo.status != "complete") return;
  console.log("tabs.onUpdated", tabId, changedInfo);
  resume(tab.url);
});
chrome.tabs.onActivated.addListener(async function (activeInfo) {
  let tab = await a(chrome.tabs.get)(activeInfo.tabId);
  console.log("tabs.onActivated", activeInfo, tab.url, tab.title);
  resume(tab.url);
});
chrome.windows.onFocusChanged.addListener(async function (windowId) {
  console.log("windows.onFocusChanged", windowId);
  if(windowId == -1) pause();
  else {
    let tab = await a(chrome.tabs.getSelected)(null);
    resume(tab.url);
  }
});
chrome.tabs.onRemoved.addListener(function (tabId, removeInfo) {
  console.log("tabs.onRemoved", tabId, removeInfo);
});
chrome.idle.setDetectionInterval(15);
chrome.idle.onStateChanged.addListener(function (newState) {
  console.log("idle.onStateChanged", newState);
  if(newState == "active") resume(); else pause();
});