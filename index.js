const Blynk = require('blynk-library');
const Gpio  = require('pigpio').Gpio;

const AUTH = process.env.AUTH_TOKEN;

const blynk = new Blynk.Blynk(AUTH, options = {
	connector : new Blynk.TcpClient( options = { addr:"127.0.0.1", port:7070 } )
});

// const led = {
// 	id: 25,
// 	gpio: new Gpio(25, Gpio.OUTPUT),
// };
const sensor = {
	id: 22,
	gpio: new Gpio(22,  {
		mode: Gpio.INPUT,
		pullUpDown: Gpio.PUD_UP,
		alert: true,
	}),
};
const relay = {
	id: 26,
	gpio: new Gpio(26, Gpio.OUTPUT),
};

const desiredState = {
	id: 10,
	pin: new blynk.VirtualPin(10),
	isOpen: false
};
const doorStatus = {
	id: 0,
	pin: new blynk.VirtualPin(0),
};
const open = {
	id: 1,
	pin: new blynk.VirtualPin(1),
};
const close = {
	id: 2,
	pin: new blynk.VirtualPin(2),
};
const video = {
	id: 3,
	pin: new blynk.VirtualPin(3),
};

sensor.gpio.glitchFilter(10000);
sensor.gpio.on('alert', (value, tick) => { 
	console.log('Door Sensor State Change:', value);
	console.log('State is now: ' + doorStateString(value, desiredState.isOpen));
	//led.gpio.digitalWrite(value);
	
	// push doorStatus state to device
	blynk.virtualWrite(doorStatus.id, doorStateString(sensor.gpio.digitalRead(), desiredState.isOpen));
});

open.pin.on('write', function(param) {
	console.log('open:', param);

	let value = param[0]
	if(value == '1') {
		console.log('Open Door Request');

		if(desiredState.isOpen) {
			console.log('Door Already Open... Skipping!');
		}
		else {
			console.log('Door Closed...  Opening!');
			desiredState.isOpen = !desiredState.isOpen;

			triggerRelay();
		}
	}
	console.log('desiredState.isOpen: ' + desiredState.isOpen);

	// push desiredState state to device
	blynk.virtualWrite(doorStatus.id, doorStateString(sensor.gpio.digitalRead(), desiredState.isOpen));
});

close.pin.on('write', function(param) {
	console.log('close:', param);

	let value = param[0]
	if(value == '1') {
		console.log('Close Door Request');

		if(!desiredState.isOpen) {
			console.log('Door Already Closed... Skipping!');
		}
		else {
			console.log('Door Open...  Closing!');
			desiredState.isOpen = !desiredState.isOpen;

			triggerRelay();
		}
	}
	console.log('desiredState.isOpen: ' + desiredState.isOpen);

	// push desiredState state to virtual pin 9
	blynk.virtualWrite(doorStatus.id, doorStateString(sensor.gpio.digitalRead(), desiredState.isOpen));
});

desiredState.pin.on('read', function() {
	desiredState.pin.write(doorStateString(desiredState.isOpen));
});

doorStatus.pin.on('read', function() {
	let sensorValue = sensor.gpio.digitalRead();
	doorStatus.pin.write(doorStateString(sensorValue, desiredState.isOpen));
});

const triggerRelay = function triggerRelay() {
	// turn on the relay
	relay.gpio.digitalWrite(1);

	// turn off the relay after .75 seconds
	setTimeout(() => relay.gpio.digitalWrite(0), 750 );
};

const doorStateString = function(sensor, requested) {
// const doorStateString = function(doorIsOpen) {
	if(sensor){
		return "OPEN";
	}
	else {
		return "CLOSED";
	}
}

// const doorStateString = function(sensor, requested) {
// 	if(sensor && requested) {
// 		return "OPEN";
// 	}
// 	else if(!sensor && requested) {
// 		return "OPENING";
// 	}
// 	else if(!sensor && !requested) {
// 		return "CLOSED";
// 	}
// 	else if(sensor && !requested) {
// 		return "CLOSING";
// 	}
// }


// ******** setup / teardown *********
blynk.on('connect', function() { 
	console.log("Blynk ready."); 
});

blynk.on('disconnect', function() { 
	console.log("DISCONNECT"); 

	sensor.gpio.pullUpDown(Gpio.PUD_OFF);
	sensor.gpio.disableInterrupt();
	//relay.gpio.digitalWrite(0);
	//led.gpio.digitalWrite(0);
});
