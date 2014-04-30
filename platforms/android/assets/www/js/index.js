/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
var mobileApp = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicity call 'mobileApp.receivedEvent(...);'
    
     onDeviceReady: function() {
     	//alert(navigator.camera);
     	//navigator.Camera.getPicture(mobileApp.onCameraSuccess, mobileApp.onCameraFail, {
	    //     quality: 50, 
	    //     destinationType: navigator.camera.DestinationType.FILE_URI,
	    //     sourceType: pictureSource
	    //});
       	navigator.geolocation.watchPosition(mobileApp.onLocationSuccess, mobileApp.onLocationError, {maximumAge: 300000, timeout:10000, enableHighAccuracy : true});
    },
    
    onLocationSuccess: function(position) {
    	
    	var longitude = position.coords.longitude;
    	var latitude = position.coords.latitude;
    	var latLong = new google.maps.LatLng(latitude, longitude);
    	
    	var mapOptions = {
    		center: latLong,
    		zoom: 16,
    		mapTypeId: google.maps.MapTypeId.ROADMAP
    	};
    	
    	var map = new google.maps.Map(document.getElementById("geolocation"), mapOptions);  
    	document.getElementById("geolocation").className = document.getElementById("geolocation").className + " geolocation-active";
    
    	marker = new google.maps.Marker({
            draggable: true,
            raiseOnDrag: false,
            icon:'https://dl.dropbox.com/u/20772744/car.png',
            map: map,
            position: latLong
     	});
    },
    
    onLocationError: function(error) {
    	alert('code: ' +error.code+ '\n' + 'message: ' +error.message + '\n');
    },
    
    onCameraSuccess: function(imageData) {
	    var image = document.getElementById('myImage');
	    image.src = "data:image/jpeg;base64," + imageData;
	},
	
	onCameraFail: function(message) {
	    alert('Failed because: ' + message);
	},
	
	Camera: function() {
		alert(navigator.camera);
		navigator.camera.getPicture(mobileApp.onCameraSuccess, mobileApp.onCameraFail, { quality: 50,
		    destinationType: Camera.DestinationType.DATA_URL
		});
	}
};
