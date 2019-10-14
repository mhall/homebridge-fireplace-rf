'use strict';
const rpio = require('rpio');

class RemoteTransmitter {
  
  constructor(address, pin) {
    this._address    = address; // fireplace address
    this._pin        = pin; // GPIO pin for transmitter
    this._periodusec = 265; // experimentally determined
    this.currLevel = 0;
    rpio.open(this._pin, rpio.OUTPUT, rpio.LOW);
  }

  setOnOff(on, coldOn) {
    // set flame height to max for 'on' or 0 for 'off'
    this.sendControl(on, coldOn, 220);
    this.currLevel = on ? 100 : 0;
  }
  
  setLevel(level) {
    // user-set flame height
    this.sendControl(level > this.currLevel, false, Math.abs(this.currLevel - level) * 2);
    this.currLevel = level;
  }
  
  // transmit signal <address><command> multiple times simulating remote button press
  sendControl(up, coldOn, repeats) {
    for (let i = (coldOn ? 10 : repeats); i > 0; i--) {
      this.sendBits(this._address); // send address
      if (coldOn) 
	  this.sendBits("110011"); // remote 'light' button
      else if (up)
	  this.sendBits("111011"); // remote 'flame up' button
      else
	  this.sendBits("000000"); // remote 'flame down' button
      rpio.msleep(20);
    }
    if (coldOn) {
      // wait for auto-light procedure to complete
      rpio.sleep(30);
      // resend command now that fireplace has been lit
      this.sendControl(up, false, repeats);
    }
  }

  // low level routines to transmit bits with proper pulse modulation
  sendBits(bitStr) {
    for (let i = 0; i < bitStr.length; i++) {
      this.sendBit(parseInt(bitStr.charAt(i)));
    }
  }
  sendBit(isBitOne) {
    if (isBitOne) {
      rpio.write(this._pin, rpio.HIGH);
      rpio.usleep(this._periodusec * 2);
      rpio.write(this._pin, rpio.LOW);
      rpio.usleep(this._periodusec);
    } else {
      rpio.write(this._pin, rpio.HIGH);
      rpio.usleep(this._periodusec);
      rpio.write(this._pin, rpio.LOW);
      rpio.usleep(this._periodusec * 2);
    }
  }

}

module.exports = (address, pin) => {
  return new RemoteTransmitter(address, pin);
}
