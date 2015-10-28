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
	function awsNodeBroker(n) {
		RED.nodes.createNode(this, n);
		this.deviceName = n.name;
		var node = this;

		node.connect = function() {
			if (!node.device) {
				node.log("Attemp to connect to " + n.clientId + ", " + n.certsId);
				node.device = awsIot.device({
					keyPath : './awsCerts/' + n.certsId + '-private.pem.key',
					certPath : './awsCerts/' + n.certsId + '-certificate.pem.crt',
					caPath : './awsCerts/root-CA.crt',
					clientId : n.clientId,
					region : n.region
				});
			}
		};

		node.register = function(_node) {
			node.device.on('connect', function() {
				_node.status({
					fill : "green",
					shape : "dot",
					text : "common.status.connected"
				});
			});
			node.device.on('reconnect', function() {
				_node.status({
					fill : "yellow",
					shape : "dot",
					text : "common.status.connecting"
				});
			});
			node.device.on('error', function(error) {
				_node.error(error);
			});
			node.device.on('offline', function() {
				_node.status({
					fill : "red",
					shape : "dot",
					text : "common.status.disconnected"
				});				
			});
			node.on('close', function() {
				node.log("closed " + n.name + " ok");
			});
		};
	}

	RED.nodes.registerType("aws-iot-device", awsNodeBroker);

	function awsMqttNodeIn(n) {
		RED.nodes.createNode(this, n);
		this.myDevice = n.device;
		this.awsIot = RED.nodes.getNode(this.myDevice);

		if (this.awsIot) {
			var node = this;
			this.awsIot.connect();
			this.awsIot.register(node);
			node.status({
				fill : "yellow",
				shape : "dot",
				text : "common.status.connecting"
			});
			this.awsIot.device.subscribe(n.topic);
			this.awsIot.device.on('message', function(topic, payload) {
				node.log('message: ' + topic + ", " + payload.toString());
				node.send({
					topic : topic,
					payload : JSON.parse(payload.toString())
				});
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
			this.awsIot.register(node);
			node.status({
				fill : "yellow",
				shape : "dot",
				text : "common.status.connecting"
			});
			node.on("input", function(msg) {
				this.awsIot.device.publish(msg.topic, JSON.stringify({
					data : msg.payload
				}));
			});
		} else {
			this.error("aws-iot is not configured");
		}
	}


	RED.nodes.registerType("aws-mqtt out", awsMqttNodeOut);
};
