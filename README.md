Homebridge Plugin for Remote Control Gas Fireplaces
===================================================

This is a [Homebridge](https://github.com/nfarina/homebridge) Node.js plugin to enable Homekit control of gas fireplaces that use a 315 MHz Mertik Maxitrol remote control. You will be able to fully control the fireplace via Apple HomeKit, including on/off, light, and flame height. Since HomeKit does not include a dedicated accessory type for Fireplace, I used the Air Purifier accessory type. The icon and available HomeKit characteristics are reasonable for a fireplace.

Pre-setup Notes
---------------

Unfortunately, this is not a simple plugin to set up. It requires a hardware transmitter to send the 315 MHz signals necessary to emulate the fireplace remote. I am running Homebridge on a Raspberry Pi and have a GPIO pin connected to this [315 MHz transmitter](https://www.sparkfun.com/products/10535). In addition, each fireplace has a 17 bit address that is transmitted before every remote control command. These are unique per fireplace. All tranmissions from the remote are pulse encoded with a period of approximately 315 microseconds. Bits are represented as

    1 = on-on-off
    0 = on-off-off

Unfortunately, the address does not appear to be printed on the remote or otherwise easily discoverable. I determined my address with a software defined radio. It should also be possible to brute-force it if you don't have an SDR available.

Installation
------------
After obtaining the necessary hardware and determining the address of your fireplace, installation is similar to any other Homebridge plugin. I have not published this to npm so I recommend cloning this repo and then using the `-P` option when launching Homebridge to specify the path to the plugin code. Install the `rpio` dependency via npm in the root of the project. Then, add the following to your Homebridge `config.json` file in the `accessories` section:

    {
        "accessory": "fireplace",
        "name": "Fireplace",
        "pin": 11,
        "address": "01011100000100001"
    }

Be sure to update the address, and specify the GPIO pin where the transmitter is connected. If the user account running Homebridge does not already have access to the Raspberry Pi's GPIO pins, you will need to add the user to the `gpio` system group.
