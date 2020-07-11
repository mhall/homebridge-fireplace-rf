'use strict';
var RT = require('./lib/RemoteTransmitter.js');

var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-fireplace-rf', 'fireplace', RTAccessory);
};

function RTAccessory(log, config) {

  // unique 17 bit address of fireplace
  var address = config.address;
  // GPIO pin with transmitter
  var pin = config.pin;

  var rt = RT(address, pin);
  var platform = this;
  this.log = log;

  // user-supplied accessory name
  this.name = config.name;
  // use Air Purifier accessory type as closest match for a fireplace
  this.service = new Service['AirPurifier'](this.name);

  // Air Purifier rotation speed will be used to determine flame height
  var rsChar = this.service.addCharacteristic(Characteristic.RotationSpeed);
  var apChar = this.service.getCharacteristic(Characteristic.CurrentAirPurifierState);

  // if coldOn, need to send 'light' command before increasing flame height
  var coldOn = true;
  // current on/off state
  var isOn = false;
  // current flame height
  var currHeight = 0;

  // fireplace hard shutdowns after 5 days without use
  // 'on' commands after this time must be preceeded by 'light'
  var coldTimer;
  var coldLim = 432000000; // 4.5 days

  // prevent soft shutdown after 6 hours
  function doRefresh() {
    rt.setLevel(currHeight - 6);
    setTimeout((function() { rt.setLevel(currHeight); }), 2000);
  }
  var refreshTimer;
  var refreshLim = 21240000; // 5.5 hours

  this.service.getCharacteristic(Characteristic.Active)
    .on('set', function(value, callback) {
      var switchOn = value ? true : false;
      // update status between 'on' and 'off'
      if (switchOn != isOn) {
        platform.log(config.name, "switch -> " + switchOn);
        rt.setOnOff(switchOn, coldOn);
        isOn = switchOn;
        coldOn = false;
	currHeight = switchOn ? 100 : 0;
        apChar.updateValue(switchOn ? Characteristic.CurrentAirPurifierState.PURIFYING_AIR : Characteristic.CurrentAirPurifierState.INACTIVE);
        rsChar.updateValue(switchOn ? 100 : 0);
      }
      // handle soft and hard shutdown timers as appropriate
      if (switchOn) {
        clearInterval(coldTimer);
        clearInterval(refreshTimer);
        refreshTimer = setInterval(doRefresh, refreshLim);
      } else {
        clearInterval(refreshTimer);
        clearInterval(coldTimer);
        coldTimer = setInterval((function() { coldOn = true; }), coldLim);
      }
      callback();
  });

  // adjust flame height
  rsChar.on('set', function(level, callback) {
    if (isOn) {
      platform.log(config.name, "level -> " + level);
      rt.setLevel(level);
      // if sufficient flame height change, reset auto-off timer
      if (Math.abs(level - currHeight) > 5) {
        clearInterval(refreshTimer);
        refreshTimer = setInterval(doRefresh, refreshLim);
      }
      currHeight = level;
    }
    callback();
  });

}

RTAccessory.prototype.getServices = function() {
  return [this.service];
};
