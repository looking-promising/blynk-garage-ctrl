var Blynk = require('blynk-library');

//var AUTH = '0f430568cc0b42f3bed3f6d2e0bf0338';
var AUTH = '2b2f1829e457423eb610d3afd59dc57b';

var blynk = new Blynk.Blynk(AUTH, options = {
	connector : new Blynk.TcpClient( options = { addr:"127.0.0.1", port:7070 } )
});

var doorStateString = function(doorIsOpen) {
	if(doorIsOpen){
		return "OPEN";
	}
	else {
		return "CLOSED";
	}
}

var isOpen = false;
var v1 = new blynk.VirtualPin(1);
var v9 = new blynk.VirtualPin(9);

v1.on('write', function(param) {
	console.log('V1:', param);
	if(param[0] == '1') {
		console.log('Toggling door state');
		isOpen = !isOpen;
	}
	console.log('isOpen: ' + isOpen);

	// push current state to virtual pin 9
	blynk.virtualWrite(9, doorStateString(isOpen));
});

v9.on('read', function() {
	v9.write(doorStateString(isOpen));
});

blynk.on('connect', function() { console.log("Blynk ready."); });
blynk.on('disconnect', function() { console.log("DISCONNECT"); });

