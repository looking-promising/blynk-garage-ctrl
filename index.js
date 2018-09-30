const Blynk = require('blynk-library');
const Gpio  = require('pigpio').Gpio;

const AUTH = process.env.AUTH_TOKEN;

const blynk = new Blynk.Blynk(AUTH, options = {
	connector : new Blynk.TcpClient( options = { addr:"127.0.0.1", port:7070 } )
});

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
	isEnabled: true,
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

const autoCloseTimer = {
  timer: setTimeout(() => {}, 10),
  startTimer: function() {
    autoCloseTimer.timer = setTimeout(() => { closeGarageDoor(); }, 1800000);
    //autoCloseTimer.timer = setTimeout(() => { closeGarageDoor(); }, 120000);
  },
  stopTimer: function() {
    try {
      clearTimeout(autoCloseTimer.timer);
    }
    catch(error) {
      console.error(error);
    }
  }
};

const openGarageDoor = function openGarageDoor() {
  console.log('Open Door Request');

  if (sensor.gpio.digitalRead()) {
    console.log('Door Already Open... Skipping!');
  }
  else {
    console.log('Door Closed...  Opening!');
    triggerRelay();
  }
}

const closeGarageDoor = function closeGarageDoor() {
  console.log('Close Door Request');

  if (!sensor.gpio.digitalRead()) {
    console.log('Door Already Closed... Skipping!');
  }
  else {
    console.log('Door Open...  Closing!');
    triggerRelay();
  }
}

const triggerRelay = function triggerRelay() {
	if(!relay.isEnabled) {
		console.log('Relay temporarily disabled -- trigger skipped!');
		return;
	}

	// disable the relay so it cannot be triggered until the door is fully open/closed
	relay.isEnabled = false;
	setTimeout(() => relay.isEnabled = true, 15000);

	// turn on the relay
	relay.gpio.digitalWrite(1);

	// turn off the relay after .75 seconds
	setTimeout(() => relay.gpio.digitalWrite(0), 750 );
};

const triggerAutoCloseTimer = function(doorIsOpen) {
	if(doorIsOpen) {
    autoCloseTimer.startTimer();
  }
  else {
    autoCloseTimer.stopTimer();
  }
};

const doorStateString = function(doorIsOpen) {
	if(doorIsOpen){
		return "OPEN";
	}
	else {
		return "CLOSED";
	}
}

sensor.gpio.glitchFilter(10000);
sensor.gpio.on('alert', (sensorState, tick) => {
  let dss = doorStateString(sensorState);
	console.log('Door Sensor State Change:', sensorState);
	console.log('State is now: ' + dss);
	//sensorState = sensor.gpio.digitalRead();

	// push doorStatus state to app on device
	blynk.virtualWrite(doorStatus.id, dss);
	
	// send notification to device
	console.log('Begin: Sending push notification.');
	blynk.notify('Your garage door is now ' + dss + '!');
	console.log('Done: Sending push notification.');
	
	// set an auto close timer
	triggerAutoCloseTimer(sensorState)
});

open.pin.on('write', function(param) {
	console.log('open signal sent:', param);

	let value = param[0]
	if(value == '1') {
    openGarageDoor();
	}

	// push current state to device
	blynk.virtualWrite(doorStatus.id, doorStateString(sensor.gpio.digitalRead()));
});

close.pin.on('write', function(param) {
	console.log('close signal sent:', param);

	let value = param[0]
	if(value == '1') {
    closeGarageDoor();
	}

	// push current state to virtual pin 9
	blynk.virtualWrite(doorStatus.id, doorStateString(sensor.gpio.digitalRead()));
});

doorStatus.pin.on('read', function() {
	let sensorValue = sensor.gpio.digitalRead();
	doorStatus.pin.write(doorStateString(sensorValue));
});


// ******** setup / teardown *********
blynk.on('connect', function() { 
	console.log("Blynk ready."); 
});

blynk.on('disconnect', function() { 
	console.log("DISCONNECT"); 

	sensor.gpio.pullUpDown(Gpio.PUD_OFF);
	sensor.gpio.disableInterrupt();
});
