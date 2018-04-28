'use strict';
var VRT = require('./lib/ValorRemoteTransmitter.js');

var Service, Characteristic;

module.exports = function(homebridge) {
  Service = homebridge.hap.Service;
  Characteristic = homebridge.hap.Characteristic;
  homebridge.registerAccessory('homebridge-valor-fireplace', 'valorremote', RTAccessory);
};

function RTAccessory(log, config) {

  // unique 17 bit address of fireplace
  var address = config.address;
  // GPIO pin with 315MHz transmitter
  var pin = config.pin;

  var vrt = VRT(address, pin);
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

  // prevent soft shutdown after 6 hours
  function doRefresh() {
    vrt.setLevel(currHeight - 6);
    setTimeout((function() { vrt.setLevel(currHeight); }), 2000);
  }
  var refreshTimer;

  this.service.getCharacteristic(Characteristic.Active)
    .on('set', function(value, callback) {
      var switchOn = value ? true : false;
      // update status between 'on' and 'off'
      if (switchOn != isOn) {
        platform.log(config.name, "switch -> " + switchOn);
        vrt.setOnOff(switchOn, coldOn);
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
        refreshTimer = setInterval(doRefresh, 21240000); // 5.5 hours
      } else {
        clearInterval(refreshTimer);
        clearInterval(coldTimer);
        coldTimer = setInterval((function() { coldOn = true; }), 432000000); // 4.5 days
      }
      callback();
  });

  // adjust flame height
  rsChar.on('set', function(level, callback) {
    platform.log(config.name, "level -> " + level);
    vrt.setLevel(level);
    // if sufficient flame height change, reset auto-off timer
    if (Math.abs(level - currHeight) > 5) {
      clearInterval(refreshTimer);
      refreshTimer = setInterval(doRefresh, 21240000);
    }
    currHeight = level;
    callback();
  });

}

RTAccessory.prototype.getServices = function() {
  return [this.service];
};
