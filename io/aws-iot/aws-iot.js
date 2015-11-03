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
	function awsNodeBroker(n) {
		RED.nodes.createNode(this, n);
		this.deviceName = n.name;
		var self = this;

		this.connect = function() {
			if (!self.device) {
				self.log("Attemp to connect to " + n.mode + " with " + n.clientId + ", " + n.certsId);
				if (n.mode == "shadow") {
					self.device = require('aws-iot-device-sdk').thingShadow({
						keyPath : '../awsCerts/' + n.certsId + '-private.pem.key',
						certPath : '../awsCerts/' + n.certsId + '-certificate.pem.crt',
						caPath : '../awsCerts/root-CA.crt',
						clientId : n.clientId,
						region : n.region
					});
				} else {
					self.device = require('aws-iot-device-sdk').device({
						keyPath : '../awsCerts/' + n.certsId + '-private.pem.key',
						certPath : '../awsCerts/' + n.certsId + '-certificate.pem.crt',
						caPath : '../awsCerts/root-CA.crt',
						clientId : n.clientId,
						region : n.region
					});
				}
			}
		};

		this.register = function(_node) {
			var onDeviceConnect = function() {
				_node.status({
					fill : "green",
					shape : "dot",
					text : "common.status.connected"
				});
			};
			var onDeviceReconnect = function() {
				_node.status({
					fill : "yellow",
					shape : "dot",
					text : "common.status.connecting"
				});
			};
			var onDeviceError = function(error) {
				_node.error(error);
			};
			var onDeviceOffline = function() {
				_node.status({
					fill : "red",
					shape : "dot",
					text : "common.status.disconnected"
				});
			};
			self.device.on('connect', onDeviceConnect);
			self.device.on('reconnect', onDeviceReconnect);
			self.device.on('error', onDeviceError);
			self.device.on('offline', onDeviceOffline);
		};
		self.on('close', function() {
			self.log("closed " + n.name + " ok");
			self.device.end();
		});
	}


	RED.nodes.registerType("aws-iot-device", awsNodeBroker);

	function awsMqttNodeIn(n) {
		RED.nodes.createNode(this, n);
		this.myDevice = n.device;
		this.awsIot = RED.nodes.getNode(this.myDevice);

		if (this.awsIot) {
			var self = this;
			this.awsIot.connect();
			this.awsIot.register(self);
			self.status({
				fill : "yellow",
				shape : "dot",
				text : "common.status.connecting"
			});
			self.log('Subscribe: ' + this.awsIot.name + ", " + n.topic);
			this.awsIot.device.subscribe(n.topic);
			this.awsIot.device.on('message', function(topic, payload) {
				self.log('onMessage: ' + topic + ", " + payload.toString());
				self.send({
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
			var options = {
				qos : n.qos || 0,
				retain : n.retain || false
			};
			node.on("input", function(msg) {
				this.awsIot.device.publish(msg.topic, JSON.stringify(msg.payload), options);
			});
		} else {
			this.error("aws-iot is not configured");
		}
	}


	RED.nodes.registerType("aws-mqtt out", awsMqttNodeOut);
	
	function awsThingShadowNodeIn(n) {
		RED.nodes.createNode(this, n);
		this.myDevice = n.device;
		this.awsIot = RED.nodes.getNode(this.myDevice);

		if (this.awsIot) {
			var self = this;
			this.awsIot.connect();
			this.awsIot.register(self);
			self.status({
				fill : "yellow",
				shape : "dot",
				text : "common.status.connecting"
			});
			self.log('Subscribe: ' + this.awsIot.name);
			
			this.awsIot.device.on('message', function(topic, payload) {
				self.log('onMessage: ' + topic + ", " + payload.toString());
				self.send({
					topic : topic,
					payload : JSON.parse(payload.toString())
				});
			});
		} else {
			this.error("aws-iot is not configured");
		}
	}


	RED.nodes.registerType("aws-thing in", awsThingShadowNodeIn);
	
	function awsThingShadowNodeOut(n) {
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
				
			});
		} else {
			this.error("aws-iot is not configured");
		}
	}


	RED.nodes.registerType("aws-thing out", awsThingShadowNodeOut);
};
