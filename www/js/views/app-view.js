/*global Backbone, jQuery, _, ENTER_KEY */
var app = app || {};
var map;
var directionsDisplay;
var directionsService = new google.maps.DirectionsService();
var currentMarker;
var markers = [];
var hilightedMarker;
var picOrientation;

(function ($) {
	'use strict';

	// The Application
	// ---------------

	// Our overall **AppView** is the top-level piece of UI.
	app.AppView = Backbone.View.extend({

		// Instead of generating a new element, bind to the existing skeleton of
		// the App already present in the HTML.
		el: '#todoapp',

		// Our template for the line of statistics at the bottom of the app.
		statsTemplate: _.template($('#stats-template').html()),

		// Delegated events for creating new items, and clearing completed ones.
		events: {
			'click #take-pic': 'Camera',
			'click #test': 'create',
		},

		// At initialization we bind to the relevant events on the `Todos`
		// collection, when items are added or changed. Kick things off by
		// loading any preexisting todos that might be saved in *localStorage*.
		initialize: function () {
			this.$footer = this.$('#footer');
			this.$main = this.$('#main');
			this.$list = $('#todo-list');
			this.$imageData = $('#imageData');
			this.$lat = $('#lat');
			this.$long = $('#long');
			this.$mode = $('#direction-mode');
			
			_.bindAll(this, 'onCameraSuccess', 'onCameraFail');
			_.bindAll(this, 'onLocationSuccess', 'onLocationError');
			_.bindAll(this, 'newAttributes', 'create', 'getOrientation', 'newMarker', 'calcRoute');

			this.listenTo(app.todos, 'add', this.addOne);
			this.listenTo(app.todos, 'reset', this.addAll);
			this.listenTo(app.todos, 'all', this.render);
			
			
			var _this = this;
			document.getElementById('direction-mode').onchange=function(){ _this.calcRoute(); };
			
			document.addEventListener('deviceready', this.onDeviceReady, false);
			this.onDeviceReady();

			// Suppresses 'add' events with {reset: true} and prevents the app view
			// from being re-rendered for every model. Only renders when the 'reset'
			// event is triggered at the end of the fetch.
			app.todos.fetch({reset: true});
		},
		
		onDeviceReady: function() {
			navigator.geolocation.watchPosition(this.onLocationSuccess, this.onLocationError, {enableHighAccuracy : true});
		},
		
		onLocationSuccess: function(position) {
			
			var longitude = position.coords.longitude;
			var latitude = position.coords.latitude;
			var latLong = new google.maps.LatLng(latitude, longitude);
			
			document.getElementById('lat').value = latitude;
			document.getElementById('long').value = longitude;
			
			var mapOptions = {
				center: latLong,
				zoom: 20,
				mapTypeId: google.maps.MapTypeId.ROADMAP
			};
			
			var _this = this;
			
			if (map == null) {
				map = new google.maps.Map(document.getElementById("geolocation"), mapOptions);  
				app.todos.each(function(todo) {
					_this.newMarker(todo, _this);
				});
				directionsDisplay = new google.maps.DirectionsRenderer();
				directionsDisplay.setMap(map);
				directionsDisplay.setPanel(document.getElementById("directions"));
			} else if (hilightedMarker == null) {
				map.setCenter(latLong);
			}
			
			if (currentMarker == null) {			
				currentMarker = new google.maps.Marker({
					draggable: false,
					raiseOnDrag: false,
					icon:'img/person2.png',
					map: map,
					position: latLong
				});		
			} else {
				currentMarker.setPosition(latLong);
			}
			
			currentMarker.setZIndex(100);	
			
		},
		
		onLocationError: function(error) {
			alert('code: ' +error.code+ '\n' + 'message: ' +error.message + '\n');
		},
		
		newMarker: function(todo, _this) {
			var size = (todo.get('orientation') == "landscape"? new google.maps.Size(window.innerHeight*0.1, window.innerWidth*0.1) : new google.maps.Size(window.innerWidth*0.1, window.innerHeight*0.1));
			var icon = new google.maps.MarkerImage(
		    	todo.get('image'), //url
		    	null, //size
		    	null, //origin
		    	null, //anchor 
		    	size
		    );
			var marker = new google.maps.Marker({
				draggable: false,
				raiseOnDrag: false,
				icon: icon,
				map: map,
				position: new google.maps.LatLng(todo.get('lat'), todo.get('long'))
			});
			
			google.maps.event.addListener(marker, 'click', function() {
				window.hilightedMarker = this;
				_this.calcRoute();
			});
			
			markers[todo.get('order')-1] = marker;
		},
		
		onCameraSuccess: function(imageData) {
			document.getElementById('imageData').value =  "data:image/jpeg;base64," + imageData;
			this.create();
		},
		
		onCameraFail: function(message) {
			alert('Failed because: ' + message);
		},
		
		create: function() {
			window.picOrientation = this.getOrientation();
			var newTodo = app.todos.create(this.newAttributes());
			this.newMarker(newTodo);
		},
		
		Camera: function() {
			navigator.camera.getPicture(this.onCameraSuccess, this.onCameraFail, { quality: 50,
				destinationType: Camera.DestinationType.DATA_URL,
				targetWidth: 250,
				targetHeight: 250,
				correctOrientation: true
			});
		},

		// Re-rendering the App just means refreshing the statistics -- the rest
		// of the app doesn't change.
		render: function () {

			if (app.todos.length) {
				this.$main.show();
				this.$footer.show();
			} else {
				this.$main.hide();
				this.$footer.hide();
			}
		},

		// Add a single todo item to the list by creating a view for it, and
		// appending its element to the `<ul>`.
		addOne: function (todo) {
			var view = new app.TodoView({ model: todo });
			this.$list.append(view.render().el);
		},

		// Add all items in the **Todos** collection at once.
		addAll: function () {
			this.$list.html('');
			app.todos.each(this.addOne, this);
		},

		// Generate the attributes for a new Todo item.
		newAttributes: function () {
			return {
				order: app.todos.nextOrder(),
				lat: this.$lat.val(),
				long: this.$long.val(),
				orientation: window.picOrientation,
				image: this.$imageData.val()
			};
		},
		
		getOrientation: function() {
		    switch (window.orientation) {
		        case 0:
		            // portrait, home bottom
		        case 180:
		            // portrait, home top
		            //alert("portrait H: " + $(window).height() + " W: " + $(window).width());
		            return "portrait";
		        case -90:
		            // landscape, home left
		        case 90:
		            // landscape, home right
		            //alert("landscape H: " + $(window).height() + " W: " + $(window).width());
		           return "landscape";
		    }
		},
		
		calcRoute: function() {
			var mode;
			switch (document.getElementById('direction-mode').value) {
				case "DRIVING":
					mode = google.maps.TravelMode.DRIVING;
					break;
				case "WALKING":
					mode = google.maps.TravelMode.WALKING;
					break;
				case "BICYCLING":
					mode = google.maps.TravelMode.BICYCLING;
					break;
				case "TRANSIT":
					mode = google.maps.TravelMode.TRANSIT;
					break;
			}
			 var request = {
			    origin:currentMarker.getPosition(),
			    destination:hilightedMarker.getPosition(),
			    travelMode: mode
			  };
			   directionsService.route(request, function(response, status) {
			    if (status == google.maps.DirectionsStatus.OK) {
			      directionsDisplay.setDirections(response);
			    }
			  });
			  document.getElementById("directions-button").className = "active";
		}
	});
})(jQuery);