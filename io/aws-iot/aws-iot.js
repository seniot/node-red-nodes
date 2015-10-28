/**
 * Copyright 2014 IBM Corp.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 **/

module.exports = function(RED) {
	"use strict";
	var awsIot = require('aws-iot-device-sdk');
	var deviceConfig = {
		"host" : "A26OTSETG4SEYQ.iot.ap-northeast-1.amazonaws.com",
		"port" : 8883,
		"clientId" : "Device-001",
		"caCert" : "root-CA.crt",
		"clientCert" : "47d4932ed6-certificate.pem.crt",
		"privateKey" : "47d4932ed6-private.pem.key"
	};
	function awsNodeBroker(n) {
		RED.nodes.createNode(this, n);

		this.deviceName = n.name;
		var node = this;

		node.connect = function() {
			node.log("Attemp to connect to " + n.clientId + ", " + n.certsId);
			node.device = awsIot.device({
				keyPath : './awsCerts/' + n.certsId + '-private.pem.key',
				certPath : './awsCerts/' + n.certsId + '-certificate.pem.crt',
				caPath : './awsCerts/root-CA.crt',
				clientId : n.clientId,
				region : n.region
			});
			node.device.on('connect', function(connack) {
				node.log(connack);				
			});
			node.device.on('error', function(error) {
				node.error(error);				
			});
			node.device.on('offline', function() {
				node.warn('offline.');				
			});
		};

		node.on('close', function() {
			node.log("closed " + n.name + " ok");
		});
	}


	RED.nodes.registerType("aws-iot-device", awsNodeBroker);

	function awsMqttNodeIn(n) {
		RED.nodes.createNode(this, n);
		this.myDevice = n.device;
		this.awsIot = RED.nodes.getNode(this.myDevice);

		if (this.awsIot) {
			var node = this;
			this.awsIot.connect();
			node.on("input", function(msg) {
				this.awsIot.device.publish(msg.topic, JSON.stringify({
					data : msg.payload
				}));
			});
		} else {
			this.error("aws-iot is not configured");
		}
	}

	RED.nodes.registerType("aws-mqtt in", awsMqttNodeIn);

	function awsMqttNodeOut(n) {
		RED.nodes.createNode(this, n);
		this.myDevice = n.device;
		this.awsIot = RED.nodes.getNode(this.myDevice);

		if (this.awsIot) {
			var node = this;
			this.awsIot.connect();
			this.awsIot.device.on('message', function(topic, payload) {
				console.log('message', topic, payload.toString());
				node.send({
					topic : topic,
					data : payload.toString()
				});
			});
		} else {
			this.error("aws-iot is not configured");
		}
	}

	RED.nodes.registerType("aws-mqtt out", awsMqttNodeOut);
};
